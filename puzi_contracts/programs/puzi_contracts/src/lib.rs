use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("3Ehs9eoZmV3vYKApXs9mJkFTRev3u8B7hMeaa1nWxX6A");

#[program]
pub mod puzi_contracts {
    use super::*;

    pub fn create_listing(
        ctx: Context<CreateListing>,
        price_per_token: u64,
        amount: u64,
        listing_id: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(price_per_token > 0, ErrorCode::InvalidPrice);

        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.sell_mint = ctx.accounts.sell_mint.key();
        listing.buy_mint = ctx.accounts.buy_mint.key();
        listing.price_per_token = price_per_token;
        listing.amount = amount;
        listing.listing_id = listing_id;
        listing.bump = ctx.bumps.listing;

        // Transfer tokens to escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_sell_token.to_account_info(),
                    to: ctx.accounts.escrow_sell_token.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                }
            ),
            amount
        )?;

        Ok(())
    }

    pub fn purchase(ctx: Context<Purchase>, buy_amount: u64) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        
        require!(listing.amount > 0, ErrorCode::ListingNotActive);
        require!(buy_amount > 0, ErrorCode::InvalidAmount);
        require!(buy_amount <= listing.amount, ErrorCode::InsufficientStock);

        // Calculate total price with u128 to avoid overflow
        // price_per_token is the price for one full token
        // buy_amount is in smallest units
        // total_price = price_per_token * buy_amount / 10^sell_decimals
        let sell_decimals = ctx.accounts.sell_mint.decimals;
        let sell_decimal_divisor = 10u128.pow(sell_decimals as u32);
        
        // Use u128 for calculation to prevent overflow
        let total_price_u128 = (listing.price_per_token as u128)
            .checked_mul(buy_amount as u128)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(sell_decimal_divisor)
            .ok_or(ErrorCode::Overflow)?;
        
        // Ensure the result fits in u64
        require!(total_price_u128 <= u64::MAX as u128, ErrorCode::Overflow);
        let total_price = total_price_u128 as u64;

        // Transfer payment from buyer to seller
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_buy_token.to_account_info(),
                    to: ctx.accounts.seller_buy_token.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                }
            ),
            total_price
        )?;

        // Transfer tokens from escrow to buyer
        let listing_seeds = &[
            b"listing",
            listing.seller.as_ref(),
            &listing.listing_id.to_le_bytes(),
            &[listing.bump],
        ];
        
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_sell_token.to_account_info(),
                    to: ctx.accounts.buyer_sell_token.to_account_info(),
                    authority: listing.to_account_info(),
                },
                &[listing_seeds]
            ),
            buy_amount
        )?;

        listing.amount = listing.amount.saturating_sub(buy_amount);
        // When amount reaches 0, the listing is effectively inactive
        // The seller can call cancel_listing to reclaim rent

        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &ctx.accounts.listing;
        
        // Allow canceling any listing that belongs to the seller
        // This helps clean up historical listings that may have been improperly closed
        // The seller constraint is already checked in the CancelListing struct
        
        let remaining = listing.amount;
        if remaining > 0 {
            let listing_seeds = &[
                b"listing",
                listing.seller.as_ref(),
                &listing.listing_id.to_le_bytes(),
                &[listing.bump],
            ];
            
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.escrow_sell_token.to_account_info(),
                        to: ctx.accounts.seller_sell_token.to_account_info(),
                        authority: listing.to_account_info(),
                    },
                    &[listing_seeds]
                ),
                remaining
            )?;
        }
        
        // Close the escrow token account
        let listing_seeds = &[
            b"listing",
            listing.seller.as_ref(),
            &listing.listing_id.to_le_bytes(),
            &[listing.bump],
        ];
        
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::CloseAccount {
                    account: ctx.accounts.escrow_sell_token.to_account_info(),
                    destination: ctx.accounts.seller.to_account_info(),
                    authority: listing.to_account_info(),
                },
                &[listing_seeds]
            )
        )?;

        // Close the listing account and return rent to seller
        // This is handled automatically by the close constraint
        Ok(())
    }
}

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub sell_mint: Pubkey,
    pub buy_mint: Pubkey,
    pub price_per_token: u64,  // Price for one full token (not smallest unit)
    pub amount: u64,            // When 0, listing is effectively inactive
    pub listing_id: u64,
    pub bump: u8,
}

impl Listing {
    // Account discriminator (8) + seller (32) + sell_mint (32) + buy_mint (32) 
    // + price_per_token (8) + amount (8) + listing_id (8) + bump (1)
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 1;
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

    pub sell_mint: Account<'info, Mint>,
    pub buy_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = seller_sell_token.mint == sell_mint.key() @ ErrorCode::InvalidMint,
        constraint = seller_sell_token.owner == seller.key() @ ErrorCode::InvalidOwner,
    )]
    pub seller_sell_token: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = sell_mint,
        associated_token::authority = listing,
    )]
    pub escrow_sell_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
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
        bump = listing.bump,
        constraint = listing.sell_mint == sell_mint.key() @ ErrorCode::InvalidMint,
        constraint = listing.buy_mint == buy_mint.key() @ ErrorCode::InvalidMint,
    )]
    pub listing: Account<'info, Listing>,

    /// Seller account must match the one in listing
    #[account(mut, constraint = seller.key() == listing.seller @ ErrorCode::InvalidSeller)]
    pub seller: SystemAccount<'info>,

    pub sell_mint: Account<'info, Mint>,
    pub buy_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = buyer_buy_token.mint == buy_mint.key() @ ErrorCode::InvalidMint,
        constraint = buyer_buy_token.owner == buyer.key() @ ErrorCode::InvalidOwner,
    )]
    pub buyer_buy_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = seller_buy_token.mint == buy_mint.key() @ ErrorCode::InvalidMint,
        constraint = seller_buy_token.owner == seller.key() @ ErrorCode::InvalidOwner,
    )]
    pub seller_buy_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = escrow_sell_token.mint == sell_mint.key() @ ErrorCode::InvalidMint,
        constraint = escrow_sell_token.owner == listing.key() @ ErrorCode::InvalidOwner,
    )]
    pub escrow_sell_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = buyer_sell_token.mint == sell_mint.key() @ ErrorCode::InvalidMint,
        constraint = buyer_sell_token.owner == buyer.key() @ ErrorCode::InvalidOwner,
    )]
    pub buyer_sell_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"listing", seller.key().as_ref(), &listing.listing_id.to_le_bytes()],
        bump = listing.bump,
        constraint = listing.seller == seller.key() @ ErrorCode::InvalidSeller,
        constraint = listing.sell_mint == sell_mint.key() @ ErrorCode::InvalidMint,
        close = seller
    )]
    pub listing: Account<'info, Listing>,

    pub sell_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = seller_sell_token.mint == sell_mint.key() @ ErrorCode::InvalidMint,
        constraint = seller_sell_token.owner == seller.key() @ ErrorCode::InvalidOwner,
    )]
    pub seller_sell_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = escrow_sell_token.mint == sell_mint.key() @ ErrorCode::InvalidMint,
        constraint = escrow_sell_token.owner == listing.key() @ ErrorCode::InvalidOwner,
    )]
    pub escrow_sell_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("E1")]  // Listing not active
    ListingNotActive,
    #[msg("E2")]  // Unauthorized
    Unauthorized,
    #[msg("E3")]  // Invalid amount
    InvalidAmount,
    #[msg("E4")]  // Invalid price  
    InvalidPrice,
    #[msg("E5")]  // Insufficient stock
    InsufficientStock,
    #[msg("E6")]  // Overflow
    Overflow,
    #[msg("E7")]  // Invalid mint
    InvalidMint,
    #[msg("E8")]  // Invalid owner
    InvalidOwner,
    #[msg("E9")]  // Invalid seller
    InvalidSeller,
}