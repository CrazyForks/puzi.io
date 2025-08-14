use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, Token};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("HBo5e3xjdjB7qtg5e87UxB6oDLCyfDdrfNWgGdPadwpQ");

#[program]
pub mod puzi_contracts {
    use super::*;

    /// 创建卖单
    pub fn create_listing(
        ctx: Context<CreateListing>,
        price_per_token: u64, // 单价
        amount: u64,          // 总数量
        listing_id: u64,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        let seller = &ctx.accounts.seller;

        // 初始化卖单数据
        listing.seller = seller.key();
        listing.sell_mint = ctx.accounts.sell_mint.key();
        listing.buy_mint = ctx.accounts.buy_mint.key();
        listing.price_per_token = price_per_token;
        listing.amount = amount;
        listing.listing_id = listing_id;
        listing.is_active = true;
        listing.bump = ctx.bumps.listing;

        // 将要卖的代币转到程序托管账户
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_sell_token.to_account_info(),
            to: ctx.accounts.escrow_sell_token.to_account_info(),
            authority: seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        msg!(
            "卖单创建成功: seller={}, amount={}, price_per_token={}",
            seller.key(),
            amount,
            price_per_token
        );
        Ok(())
    }

    /// 购买代币（支持部分成交）
    pub fn purchase(ctx: Context<Purchase>, buy_amount: u64) -> Result<()> {
        let listing = &mut ctx.accounts.listing;

        require!(listing.is_active, ErrorCode::ListingNotActive);
        require!(buy_amount > 0, ErrorCode::InvalidAmount);
        require!(buy_amount <= listing.amount, ErrorCode::InsufficientStock);

        // 计算总价（单价 * 数量）
        let total_price = listing
            .price_per_token
            .checked_mul(buy_amount)
            .ok_or(ErrorCode::Overflow)?;

        // Note: Balance checking will be handled by the token program during transfer
        // If insufficient funds, the transfer will fail

        // 买家支付指定的代币
        let cpi_accounts = Transfer {
            from: ctx.accounts.buyer_buy_token.to_account_info(),
            to: ctx.accounts.seller_buy_token.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, total_price)?;

        // 将托管的代币转给买家
        let seeds = &[
            b"listing",
            listing.seller.as_ref(),
            &listing.listing_id.to_le_bytes(),
            &[listing.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_sell_token.to_account_info(),
            to: ctx.accounts.buyer_sell_token.to_account_info(),
            authority: listing.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, buy_amount)?;

        // 更新卖单数量
        listing.amount = listing.amount.checked_sub(buy_amount).unwrap();
        if listing.amount == 0 {
            listing.is_active = false;
        }

        msg!(
            "购买完成: buyer={}, amount={}, total_price={}",
            ctx.accounts.buyer.key(),
            buy_amount,
            total_price
        );
        Ok(())
    }

    /// 取消卖单（退回剩余代币）
    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;

        require!(listing.is_active, ErrorCode::ListingNotActive);
        require!(
            listing.seller == ctx.accounts.seller.key(),
            ErrorCode::Unauthorized
        );

        if listing.amount > 0 {
            // 将托管的代币返还给卖家
            let seeds = &[
                b"listing",
                listing.seller.as_ref(),
                &listing.listing_id.to_le_bytes(),
                &[listing.bump],
            ];
            let signer_seeds = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_sell_token.to_account_info(),
                to: ctx.accounts.seller_sell_token.to_account_info(),
                authority: listing.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx =
                CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
            token::transfer(cpi_ctx, listing.amount)?;
        }

        listing.is_active = false;

        msg!("卖单已取消: seller={}", ctx.accounts.seller.key());
        Ok(())
    }
}

/// 卖单账户结构
#[account]
pub struct Listing {
    pub seller: Pubkey,         // 卖家公钥
    pub sell_mint: Pubkey,      // 要卖的代币mint
    pub buy_mint: Pubkey,       // 要收的代币mint
    pub price_per_token: u64,   // 单价
    pub amount: u64,            // 剩余数量
    pub listing_id: u64,        // 卖单ID
    pub is_active: bool,        // 是否活跃
    pub bump: u8,               // PDA bump
}

// 计算精确大小，避免浪费租金
impl Listing {
    pub const SIZE: usize = 8  // discriminator
        + 32  // seller
        + 32  // sell_mint
        + 32  // buy_mint
        + 8   // price_per_token
        + 8   // amount
        + 8   // listing_id
        + 1   // is_active
        + 1;  // bump
}

#[derive(Accounts)]
#[instruction(price_per_token: u64, amount: u64, listing_id: u64)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        init,
        payer = seller,
        space = Listing::SIZE,
        seeds = [b"listing", seller.key().as_ref(), &listing_id.to_le_bytes()],
        bump
    )]
    pub listing: Account<'info, Listing>,

    /// CHECK: This is the mint account for the token being sold
    pub sell_mint: AccountInfo<'info>,
    
    /// CHECK: This is the mint account for the token being bought
    pub buy_mint: AccountInfo<'info>,

    /// CHECK: This is the seller's token account for the token being sold
    #[account(mut)]
    pub seller_sell_token: AccountInfo<'info>,

    /// CHECK: This is the escrow token account for the token being sold
    #[account(mut)]
    pub escrow_sell_token: AccountInfo<'info>,

    /// CHECK: This is the token program
    pub token_program: AccountInfo<'info>,
    
    /// CHECK: This is the associated token program
    pub associated_token_program: Program<'info, AssociatedToken>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"listing", listing.seller.as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,

    /// CHECK: 卖家账户，从listing中验证
    #[account(mut, address = listing.seller)]
    pub seller: AccountInfo<'info>,

    /// CHECK: This is the buyer's token account for the token being bought  
    #[account(mut)]
    pub buyer_buy_token: AccountInfo<'info>,

    /// CHECK: This is the seller's token account for the token being bought
    #[account(mut)]
    pub seller_buy_token: AccountInfo<'info>,

    /// CHECK: This is the escrow token account for the token being sold
    #[account(mut)]
    pub escrow_sell_token: AccountInfo<'info>,

    /// CHECK: This is the buyer's token account for the token being sold
    #[account(mut)]
    pub buyer_sell_token: AccountInfo<'info>,

    /// CHECK: This is the token program
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"listing", seller.key().as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,

    /// CHECK: This is the seller's token account for the token being sold
    #[account(mut)]
    pub seller_sell_token: AccountInfo<'info>,

    /// CHECK: This is the escrow token account for the token being sold
    #[account(mut)]
    pub escrow_sell_token: AccountInfo<'info>,

    /// CHECK: This is the token program
    pub token_program: AccountInfo<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("卖单不活跃")]
    ListingNotActive,
    #[msg("未授权操作")]
    Unauthorized,
    #[msg("购买数量必须大于 0")]
    InvalidAmount,
    #[msg("库存不足")]
    InsufficientStock,
    #[msg("余额不足")]
    InsufficientFunds,
    #[msg("数值溢出")]
    Overflow,
}