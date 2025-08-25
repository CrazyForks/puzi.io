import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("spl_marketplace test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Puzi;

  let sellMint; // 卖的代币
  let buyMint; // 付款用的代币
  let seller, buyer;
  let sellerSellToken, sellerBuyToken;
  let buyerSellToken, buyerBuyToken;
  let listingPda, listingBump;

  const listingId = new BN(1);
  const pricePerToken = new BN(5); // 每个卖 5
  const sellAmount = new BN(100); // 卖 100 个

  it("初始化账户并转 0.02 SOL", async () => {
    // 创建两个用户
    seller = anchor.web3.Keypair.generate();
    buyer = anchor.web3.Keypair.generate();

    // 主账号转 0.02 SOL 给他们
    const tx = new anchor.web3.Transaction();
    tx.add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: seller.publicKey,
        lamports: 0.02 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    tx.add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: buyer.publicKey,
        lamports: 0.02 * anchor.web3.LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx);

    console.log("✅ 已给 seller & buyer 转 0.02 SOL");
  });

  it("创建 Mint 并给账户分配代币", async () => {
    // 创建两个代币 mint
    sellMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      0 // 小数位
    );
    buyMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      0
    );

    // 创建卖家的卖币账户并 mint
    sellerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint,
      seller.publicKey
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      sellMint,
      sellerSellToken.address,
      provider.wallet.publicKey,
      sellAmount.toNumber()
    );

    // 创建买家的付款币账户并 mint
    buyerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint,
      buyer.publicKey
    );
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      buyMint,
      buyerBuyToken.address,
      provider.wallet.publicKey,
      1000 // 买家有 1000 个付款币
    );

    // 卖家收款账户（买家的 buyMint 会转到这里）
    sellerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint,
      seller.publicKey
    );

    // 买家接收卖的币的账户
    buyerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint,
      buyer.publicKey
    );

    console.log("✅ Mint & Token Accounts 已创建");
  });

  it("创建卖单", async () => {
    [listingPda, listingBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        listingId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    // 创建 escrow token account（必须提前创建，否则转账报错）
    const escrowSellToken = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        sellMint,
        listingPda,
        true // allow owner to be PDA
      )
    ).address;

    await program.methods
      .createListing(pricePerToken, sellAmount, listingId)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        sellMint,
        buyMint,
        sellerSellToken: sellerSellToken.address,
        escrowSellToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([seller])
      .rpc();

    console.log("✅ 卖单创建成功");
  });

  it("买家购买 10 个", async () => {
    await program.methods
      .purchase(new BN(10))
      .accounts({
        buyer: buyer.publicKey,
        listing: listingPda,
        seller: seller.publicKey,
        sellMint: sellMint,
        buyMint: buyMint,
        buyerBuyToken: buyerBuyToken.address,
        sellerBuyToken: sellerBuyToken.address,
        escrowSellToken: await anchor.utils.token.associatedAddress({
          mint: sellMint,
          owner: listingPda,
        }),
        buyerSellToken: buyerSellToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    const buyerSellBal = (
      await provider.connection.getTokenAccountBalance(buyerSellToken.address)
    ).value.uiAmount;
    const sellerBuyBal = (
      await provider.connection.getTokenAccountBalance(sellerBuyToken.address)
    ).value.uiAmount;

    console.log("✅ 买家已收到卖的币:", buyerSellBal);
    console.log("✅ 卖家已收到付款币:", sellerBuyBal);

    assert.equal(buyerSellBal, 10, "买家应收到 10 个卖币");
    assert.equal(sellerBuyBal, 50, "卖家应收到 50 个付款币");
  });

  it("读取某账号下的卖单", async () => {
    // 假设 seller 是之前定义好的卖家 Keypair
    // listingId 是 BN 类型，之前定义好的

    // 计算卖单 PDA
    const [listingPda, _bump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        listingId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    // 读取卖单账户数据
    const listingAccount = await program.account.listing.fetch(listingPda);

    console.log("读取的卖单数据:");
    console.log("seller:", listingAccount.seller.toBase58());
    console.log("sell_mint:", listingAccount.sellMint.toBase58());
    console.log("buy_mint:", listingAccount.buyMint.toBase58());
    console.log("price_per_token:", listingAccount.pricePerToken.toString());
    console.log("amount:", listingAccount.amount.toString());
    console.log("listing_id:", listingAccount.listingId.toString());
    console.log("is_active:", listingAccount.amount.toNumber() > 0);
    console.log("bump:", listingAccount.bump);
  });


it("同一卖家多卖单挂单 & 查询", async () => {
  const listingId2 = new BN(2);
  const sellAmount2 = new BN(50);
  const pricePerToken2 = new BN(8);

  // 创建第二个卖单 PDA
  const [listingPda2, listingBump2] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from("listing"),
      seller.publicKey.toBuffer(),
      listingId2.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  // 创建 escrow token account（第二个卖单）
  const escrowSellToken2 = (
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint,
      listingPda2,
      true
    )
  ).address;

  // Mint 一些卖币给 seller 的 sellToken 账户（保证库存足够）
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    sellMint,
    sellerSellToken.address,
    provider.wallet.publicKey,
    sellAmount2.toNumber()
  );

  // 创建第二个卖单
  await program.methods
    .createListing(pricePerToken2, sellAmount2, listingId2)
    .accounts({
      seller: seller.publicKey,
      listing: listingPda2,
      sellMint,
      buyMint,
      sellerSellToken: sellerSellToken.address,
      escrowSellToken: escrowSellToken2,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([seller])
    .rpc();

  console.log("✅ 第二个卖单创建成功");

  // ===== 读取单个卖单数据 =====
  const listingAccount1 = await program.account.listing.fetch(listingPda);
  const listingAccount2 = await program.account.listing.fetch(listingPda2);

  console.log("卖单1:", {
    amount: listingAccount1.amount.toString(),
    price: listingAccount1.pricePerToken.toString(),
    active: listingAccount1.amount.toNumber() > 0,
  });

  console.log("卖单2:", {
    amount: listingAccount2.amount.toString(),
    price: listingAccount2.pricePerToken.toString(),
    active: listingAccount2.amount.toNumber() > 0,
  });

  // ===== 批量读取该卖家的所有卖单 =====
  const allListings = await program.account.listing.all();
  const sellerListings = allListings.filter(
    (l) => l.account.seller.toBase58() === seller.publicKey.toBase58()
  );

  console.log(`✅ 卖家 ${seller.publicKey.toBase58()} 有 ${sellerListings.length} 个卖单`);
  sellerListings.forEach((l, idx) => {
    console.log(`  卖单 #${idx + 1}`, {
      listingId: l.account.listingId.toString(),
      amount: l.account.amount.toString(),
      price: l.account.pricePerToken.toString(),
      active: l.account.amount.toNumber() > 0,
    });
  });

  // 断言有 2 个卖单
  assert.equal(sellerListings.length, 2, "卖家应有 2 个卖单");
});

it("取消卖单并返还租金", async () => {
  const sellAmount = new BN(500); // 500 tokens (0 decimals)
  const pricePerToken = new BN(1); // 1 token per token (0 decimals)
  const listingId = new BN(100);

  // 计算 listing 的 PDA
  const [listingPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("listing"),
      seller.publicKey.toBuffer(),
      listingId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  // Get seller's sell token account
  const sellerSellToken = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    sellMint,
    seller.publicKey
  );

  // Calculate escrow ATA address (contract will create it automatically)
  const escrowSellToken = getAssociatedTokenAddressSync(
    sellMint,
    listingPda,
    true // allowOwnerOffCurve = true for PDA
  );

  // Mint tokens to seller
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    sellMint,
    sellerSellToken.address,
    provider.wallet.publicKey,
    sellAmount.toNumber()
  );

  // 记录创建卖单前的余额
  const balanceBeforeCreate = await provider.connection.getBalance(seller.publicKey);

  // 创建卖单
  await program.methods
    .createListing(pricePerToken, sellAmount, listingId)
    .accounts({
      seller: seller.publicKey,
      listing: listingPda,
      sellMint,
      buyMint,
      sellerSellToken: sellerSellToken.address,
      escrowSellToken: escrowSellToken,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([seller])
    .rpc();

  // 记录创建卖单后的余额
  const balanceAfterCreate = await provider.connection.getBalance(seller.publicKey);
  const rentPaid = balanceBeforeCreate - balanceAfterCreate;
  console.log(`创建卖单支付的租金: ${rentPaid / LAMPORTS_PER_SOL} SOL`);

  // 验证卖单创建成功
  const listingAccount = await program.account.listing.fetch(listingPda);
  assert.ok(listingAccount.amount.toNumber() > 0, "卖单应该有剩余数量");

  // 记录取消前的余额
  const balanceBeforeCancel = await provider.connection.getBalance(seller.publicKey);

  // 取消卖单
  await program.methods
    .cancelListing()
    .accounts({
      seller: seller.publicKey,
      listing: listingPda,
      sellMint,
      sellerSellToken: sellerSellToken.address,
      escrowSellToken: escrowSellToken,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([seller])
    .rpc();

  // 记录取消后的余额
  const balanceAfterCancel = await provider.connection.getBalance(seller.publicKey);
  const rentRefunded = balanceAfterCancel - balanceBeforeCancel;
  console.log(`取消卖单返还的租金: ${rentRefunded / LAMPORTS_PER_SOL} SOL`);

  // 验证账户已关闭
  try {
    await program.account.listing.fetch(listingPda);
    assert.fail("卖单账户应该已经被关闭");
  } catch (error) {
    // 预期的错误，账户不存在
    console.log("✅ 卖单账户已成功关闭");
  }

  // 验证租金返还（考虑交易费用）
  assert(rentRefunded > 0, "应该返还租金");
  console.log("✅ 租金成功返还给卖家");
});

it("购买所有代币后可以取消卖单回收租金", async () => {
  const sellAmount = new BN(100); // 100 tokens (0 decimals)
  const pricePerToken = new BN(2); // 2 tokens per token (0 decimals)
  const listingId = new BN(200);

  // 计算 listing 的 PDA
  const [listingPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("listing"),
      seller.publicKey.toBuffer(),
      listingId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  // Get accounts
  const sellerSellToken = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    sellMint,
    seller.publicKey
  );

  const escrowSellToken = getAssociatedTokenAddressSync(
    sellMint,
    listingPda,
    true // allowOwnerOffCurve = true for PDA
  );

  // Mint tokens to seller
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    sellMint,
    sellerSellToken.address,
    provider.wallet.publicKey,
    sellAmount.toNumber()
  );

  // 创建卖单
  await program.methods
    .createListing(pricePerToken, sellAmount, listingId)
    .accounts({
      seller: seller.publicKey,
      listing: listingPda,
      sellMint,
      buyMint,
      sellerSellToken: sellerSellToken.address,
      escrowSellToken: escrowSellToken,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([seller])
    .rpc();

  // Get buyer accounts
  const buyerBuyToken = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    buyMint,
    buyer.publicKey
  );

  const sellerBuyToken = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    buyMint,
    seller.publicKey
  );

  const buyerSellToken = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    provider.wallet.payer,
    sellMint,
    buyer.publicKey
  );

  // Mint buy tokens to buyer
  const totalPrice = pricePerToken.mul(sellAmount); // No decimals adjustment needed
  await mintTo(
    provider.connection,
    provider.wallet.payer,
    buyMint,
    buyerBuyToken.address,
    provider.wallet.publicKey,
    totalPrice.toNumber()
  );

  // 购买所有代币
  await program.methods
    .purchase(sellAmount)
    .accounts({
      buyer: buyer.publicKey,
      listing: listingPda,
      seller: seller.publicKey,
      sellMint,
      buyMint,
      buyerBuyToken: buyerBuyToken.address,
      sellerBuyToken: sellerBuyToken.address,
      escrowSellToken: escrowSellToken,
      buyerSellToken: buyerSellToken.address,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([buyer])
    .rpc();

  // 验证卖单状态
  const listingAccount = await program.account.listing.fetch(listingPda);
  assert.equal(listingAccount.amount.toNumber(), 0, "所有代币应该已被购买");
  assert.equal(listingAccount.amount.toNumber(), 0, "卖单数量应该为0");

  // 记录取消前的余额
  const balanceBeforeCancel = await provider.connection.getBalance(seller.publicKey);

  // 卖家可以取消卖单以回收租金
  await program.methods
    .cancelListing()
    .accounts({
      seller: seller.publicKey,
      listing: listingPda,
      sellMint,
      sellerSellToken: sellerSellToken.address,
      escrowSellToken: escrowSellToken,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([seller])
    .rpc();

  // 记录取消后的余额
  const balanceAfterCancel = await provider.connection.getBalance(seller.publicKey);
  const rentRefunded = balanceAfterCancel - balanceBeforeCancel;
  console.log(`售罄后取消卖单返还的租金: ${rentRefunded / LAMPORTS_PER_SOL} SOL`);

  // 验证账户已关闭
  try {
    await program.account.listing.fetch(listingPda);
    assert.fail("卖单账户应该已经被关闭");
  } catch (error) {
    // 预期的错误，账户不存在
    console.log("✅ 售罄的卖单账户已成功关闭");
  }

  assert(rentRefunded > 0, "应该返还租金");
  console.log("✅ 售罄后成功回收租金");
});
});

describe("不同精度代币交易测试", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Puzi;
  
  let seller: Keypair;
  let buyer: Keypair;
  
  beforeEach(async () => {
    // 为每个测试创建新的账户
    seller = Keypair.generate();
    buyer = Keypair.generate();
    
    // 给账户转入SOL
    const tx = new anchor.web3.Transaction();
    tx.add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: seller.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      }),
      anchor.web3.SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: buyer.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx);
  });
  
  it("测试 9 位精度代币交易 (类似 SOL)", async () => {
    // 创建 9 位精度的代币
    const sellMint9 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9 // 9 decimals like SOL
    );
    
    const buyMint9 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );
    
    // 创建代币账户
    const sellerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      seller.publicKey
    );
    
    const buyerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      buyer.publicKey
    );
    
    const sellerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      seller.publicKey
    );
    
    const buyerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      buyer.publicKey
    );
    
    // Mint 代币
    const sellAmount = new BN(10 * 10 ** 9); // 10 个代币 (带 9 位精度)
    const pricePerToken = new BN(1.5 * 10 ** 9); // 每个 1.5 个代币
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      sellerSellToken.address,
      provider.wallet.publicKey,
      sellAmount.toNumber()
    );
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      buyerBuyToken.address,
      provider.wallet.publicKey,
      100 * 10 ** 9 // 100 个代币给买家
    );
    
    // 创建卖单
    const listingId = new BN(Date.now());
    const [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        listingId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    
    const escrowSellToken = getAssociatedTokenAddressSync(
      sellMint9,
      listingPda,
      true // allowOwnerOffCurve = true for PDA
    );
    
    await program.methods
      .createListing(pricePerToken, sellAmount, listingId)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        sellMint: sellMint9,
        buyMint: buyMint9,
        sellerSellToken: sellerSellToken.address,
        escrowSellToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();
    
    // 购买部分代币
    const purchaseAmount = new BN(5 * 10 ** 9); // 购买 5 个代币
    
    await program.methods
      .purchase(purchaseAmount)
      .accounts({
        buyer: buyer.publicKey,
        listing: listingPda,
        seller: seller.publicKey,
        sellMint: sellMint9,
        buyMint: buyMint9,
        buyerBuyToken: buyerBuyToken.address,
        sellerBuyToken: sellerBuyToken.address,
        escrowSellToken,
        buyerSellToken: buyerSellToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();
    
    // 验证余额
    const buyerSellBal = (
      await provider.connection.getTokenAccountBalance(buyerSellToken.address)
    ).value.uiAmount;
    const sellerBuyBal = (
      await provider.connection.getTokenAccountBalance(sellerBuyToken.address)
    ).value.uiAmount;
    
    console.log("✅ 9位精度代币测试:");
    console.log("  买家收到卖币:", buyerSellBal);
    console.log("  卖家收到付款币:", sellerBuyBal);
    
    assert.equal(buyerSellBal, 5, "买家应收到 5 个卖币");
    assert.equal(sellerBuyBal, 7.5, "卖家应收到 7.5 个付款币");
  });
  
  it("测试 6 位精度代币交易 (类似 USDC)", async () => {
    // 创建 6 位精度的代币
    const sellMint6 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6 // 6 decimals like USDC
    );
    
    const buyMint6 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6
    );
    
    // 创建代币账户
    const sellerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint6,
      seller.publicKey
    );
    
    const buyerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint6,
      buyer.publicKey
    );
    
    const sellerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint6,
      seller.publicKey
    );
    
    const buyerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint6,
      buyer.publicKey
    );
    
    // Mint 代币
    const sellAmount = new BN(100 * 10 ** 6); // 100 个代币 (带 6 位精度)
    const pricePerToken = new BN(2.5 * 10 ** 6); // 每个 2.5 USDC
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      sellMint6,
      sellerSellToken.address,
      provider.wallet.publicKey,
      sellAmount.toNumber()
    );
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      buyMint6,
      buyerBuyToken.address,
      provider.wallet.publicKey,
      1000 * 10 ** 6 // 1000 USDC给买家
    );
    
    // 创建卖单
    const listingId = new BN(Date.now());
    const [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        listingId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    
    const escrowSellToken = getAssociatedTokenAddressSync(
      sellMint6,
      listingPda,
      true // allowOwnerOffCurve = true for PDA
    );
    
    await program.methods
      .createListing(pricePerToken, sellAmount, listingId)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        sellMint: sellMint6,
        buyMint: buyMint6,
        sellerSellToken: sellerSellToken.address,
        escrowSellToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();
    
    // 购买部分代币
    const purchaseAmount = new BN(20 * 10 ** 6); // 购买 20 个代币
    
    await program.methods
      .purchase(purchaseAmount)
      .accounts({
        buyer: buyer.publicKey,
        listing: listingPda,
        seller: seller.publicKey,
        sellMint: sellMint6,
        buyMint: buyMint6,
        buyerBuyToken: buyerBuyToken.address,
        sellerBuyToken: sellerBuyToken.address,
        escrowSellToken,
        buyerSellToken: buyerSellToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();
    
    // 验证余额
    const buyerSellBal = (
      await provider.connection.getTokenAccountBalance(buyerSellToken.address)
    ).value.uiAmount;
    const sellerBuyBal = (
      await provider.connection.getTokenAccountBalance(sellerBuyToken.address)
    ).value.uiAmount;
    
    console.log("✅ 6位精度代币测试:");
    console.log("  买家收到卖币:", buyerSellBal);
    console.log("  卖家收到付款币:", sellerBuyBal);
    
    assert.equal(buyerSellBal, 20, "买家应收到 20 个卖币");
    assert.equal(sellerBuyBal, 50, "卖家应收到 50 USDC");
  });
  
  it("测试 0 位精度代币交易 (NFT-like)", async () => {
    // 创建 0 位精度的代币
    const sellMint0 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      0 // 0 decimals
    );
    
    const buyMint0 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      0
    );
    
    // 创建代币账户
    const sellerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint0,
      seller.publicKey
    );
    
    const buyerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint0,
      buyer.publicKey
    );
    
    const sellerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint0,
      seller.publicKey
    );
    
    const buyerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint0,
      buyer.publicKey
    );
    
    // Mint 代币
    const sellAmount = new BN(1000); // 1000 个代币 (无精度)
    const pricePerToken = new BN(5); // 每个 5 个代币
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      sellMint0,
      sellerSellToken.address,
      provider.wallet.publicKey,
      sellAmount.toNumber()
    );
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      buyMint0,
      buyerBuyToken.address,
      provider.wallet.publicKey,
      10000 // 10000 个代币给买家
    );
    
    // 创建卖单
    const listingId = new BN(Date.now());
    const [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        listingId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    
    const escrowSellToken = getAssociatedTokenAddressSync(
      sellMint0,
      listingPda,
      true // allowOwnerOffCurve = true for PDA
    );
    
    await program.methods
      .createListing(pricePerToken, sellAmount, listingId)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        sellMint: sellMint0,
        buyMint: buyMint0,
        sellerSellToken: sellerSellToken.address,
        escrowSellToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();
    
    // 购买部分代币
    const purchaseAmount = new BN(100); // 购买 100 个代币
    
    await program.methods
      .purchase(purchaseAmount)
      .accounts({
        buyer: buyer.publicKey,
        listing: listingPda,
        seller: seller.publicKey,
        sellMint: sellMint0,
        buyMint: buyMint0,
        buyerBuyToken: buyerBuyToken.address,
        sellerBuyToken: sellerBuyToken.address,
        escrowSellToken,
        buyerSellToken: buyerSellToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();
    
    // 验证余额
    const buyerSellBal = (
      await provider.connection.getTokenAccountBalance(buyerSellToken.address)
    ).value.uiAmount;
    const sellerBuyBal = (
      await provider.connection.getTokenAccountBalance(sellerBuyToken.address)
    ).value.uiAmount;
    
    console.log("✅ 0位精度代币测试:");
    console.log("  买家收到卖币:", buyerSellBal);
    console.log("  卖家收到付款币:", sellerBuyBal);
    
    assert.equal(buyerSellBal, 100, "买家应收到 100 个卖币");
    assert.equal(sellerBuyBal, 500, "卖家应收到 500 个付款币");
  });
  
  it("测试跨精度代币交易 (9位卖币 vs 6位买币)", async () => {
    // 创建不同精度的代币
    const sellMint9 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9 // 9 decimals like SOL
    );
    
    const buyMint6 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6 // 6 decimals like USDC
    );
    
    // 创建代币账户
    const sellerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      seller.publicKey
    );
    
    const buyerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint6,
      buyer.publicKey
    );
    
    const sellerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint6,
      seller.publicKey
    );
    
    const buyerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      buyer.publicKey
    );
    
    // Mint 代币
    const sellAmount = new BN(1 * 10 ** 9); // 1 SOL (9 decimals)
    const pricePerToken = new BN(30 * 10 ** 6); // 30 USDC per SOL (6 decimals)
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      sellerSellToken.address,
      provider.wallet.publicKey,
      sellAmount.toNumber()
    );
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      buyMint6,
      buyerBuyToken.address,
      provider.wallet.publicKey,
      100 * 10 ** 6 // 100 USDC给买家
    );
    
    // 创建卖单
    const listingId = new BN(Date.now());
    const [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        listingId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    
    const escrowSellToken = getAssociatedTokenAddressSync(
      sellMint9,
      listingPda,
      true // allowOwnerOffCurve = true for PDA
    );
    
    await program.methods
      .createListing(pricePerToken, sellAmount, listingId)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        sellMint: sellMint9,
        buyMint: buyMint6,
        sellerSellToken: sellerSellToken.address,
        escrowSellToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();
    
    // 购买部分代币
    const purchaseAmount = new BN(0.5 * 10 ** 9); // 购买 0.5 SOL
    
    await program.methods
      .purchase(purchaseAmount)
      .accounts({
        buyer: buyer.publicKey,
        listing: listingPda,
        seller: seller.publicKey,
        sellMint: sellMint9,
        buyMint: buyMint6,
        buyerBuyToken: buyerBuyToken.address,
        sellerBuyToken: sellerBuyToken.address,
        escrowSellToken,
        buyerSellToken: buyerSellToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();
    
    // 验证余额
    const buyerSellBal = (
      await provider.connection.getTokenAccountBalance(buyerSellToken.address)
    ).value.uiAmount;
    const sellerBuyBal = (
      await provider.connection.getTokenAccountBalance(sellerBuyToken.address)
    ).value.uiAmount;
    
    console.log("✅ 跨精度代币测试 (9位 vs 6位):");
    console.log("  买家收到SOL:", buyerSellBal);
    console.log("  卖家收到USDC:", sellerBuyBal);
    
    assert.equal(buyerSellBal, 0.5, "买家应收到 0.5 SOL");
    assert.equal(sellerBuyBal, 15, "卖家应收到 15 USDC");
  });
  
  it("测试跨精度代币交易 (0位卖币 vs 9位买币)", async () => {
    // 创建不同精度的代币
    const sellMint0 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      0 // 0 decimals (NFT-like)
    );
    
    const buyMint9 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9 // 9 decimals like SOL
    );
    
    // 创建代币账户
    const sellerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint0,
      seller.publicKey
    );
    
    const buyerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      buyer.publicKey
    );
    
    const sellerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      seller.publicKey
    );
    
    const buyerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint0,
      buyer.publicKey
    );
    
    // Mint 代币
    const sellAmount = new BN(10); // 10 NFTs (0 decimals)
    const pricePerToken = new BN(0.1 * 10 ** 9); // 0.1 SOL per NFT (9 decimals)
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      sellMint0,
      sellerSellToken.address,
      provider.wallet.publicKey,
      sellAmount.toNumber()
    );
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      buyerBuyToken.address,
      provider.wallet.publicKey,
      10 * 10 ** 9 // 10 SOL给买家
    );
    
    // 创建卖单
    const listingId = new BN(Date.now());
    const [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        listingId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    
    const escrowSellToken = getAssociatedTokenAddressSync(
      sellMint0,
      listingPda,
      true // allowOwnerOffCurve = true for PDA
    );
    
    await program.methods
      .createListing(pricePerToken, sellAmount, listingId)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        sellMint: sellMint0,
        buyMint: buyMint9,
        sellerSellToken: sellerSellToken.address,
        escrowSellToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();
    
    // 购买部分代币
    const purchaseAmount = new BN(3); // 购买 3 个NFT
    
    await program.methods
      .purchase(purchaseAmount)
      .accounts({
        buyer: buyer.publicKey,
        listing: listingPda,
        seller: seller.publicKey,
        sellMint: sellMint0,
        buyMint: buyMint9,
        buyerBuyToken: buyerBuyToken.address,
        sellerBuyToken: sellerBuyToken.address,
        escrowSellToken,
        buyerSellToken: buyerSellToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();
    
    // 验证余额
    const buyerSellBal = (
      await provider.connection.getTokenAccountBalance(buyerSellToken.address)
    ).value.uiAmount;
    const sellerBuyBal = (
      await provider.connection.getTokenAccountBalance(sellerBuyToken.address)
    ).value.uiAmount;
    
    console.log("✅ 跨精度代币测试 (0位 vs 9位):");
    console.log("  买家收到NFTs:", buyerSellBal);
    console.log("  卖家收到SOL:", sellerBuyBal);
    
    assert.equal(buyerSellBal, 3, "买家应收到 3 个NFT");
    assert.equal(sellerBuyBal, 0.3, "卖家应收到 0.3 SOL");
  });
  
  it("测试极小数量交易精度 (9位精度最小单位)", async () => {
    // 创建 9 位精度的代币
    const sellMint9 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );
    
    const buyMint9 = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );
    
    // 创建代币账户
    const sellerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      seller.publicKey
    );
    
    const buyerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      buyer.publicKey
    );
    
    const sellerBuyToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      seller.publicKey
    );
    
    const buyerSellToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      buyer.publicKey
    );
    
    // Mint 代币 - 测试最小单位交易
    const sellAmount = new BN(10); // 10 个最小单位
    const pricePerToken = new BN(10 ** 9); // 每个最小单位 1 个完整代币 (10^9 最小单位)
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      sellMint9,
      sellerSellToken.address,
      provider.wallet.publicKey,
      sellAmount.toNumber()
    );
    
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      buyMint9,
      buyerBuyToken.address,
      provider.wallet.publicKey,
      100 * 10 ** 9 // 100 个完整代币
    );
    
    // 创建卖单
    const listingId = new BN(Date.now());
    const [listingPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("listing"),
        seller.publicKey.toBuffer(),
        listingId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    
    const escrowSellToken = getAssociatedTokenAddressSync(
      sellMint9,
      listingPda,
      true // allowOwnerOffCurve = true for PDA
    );
    
    await program.methods
      .createListing(pricePerToken, sellAmount, listingId)
      .accounts({
        seller: seller.publicKey,
        listing: listingPda,
        sellMint: sellMint9,
        buyMint: buyMint9,
        sellerSellToken: sellerSellToken.address,
        escrowSellToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([seller])
      .rpc();
    
    // 购买最小单位
    const purchaseAmount = new BN(3); // 购买 3 个最小单位
    
    await program.methods
      .purchase(purchaseAmount)
      .accounts({
        buyer: buyer.publicKey,
        listing: listingPda,
        seller: seller.publicKey,
        sellMint: sellMint9,
        buyMint: buyMint9,
        buyerBuyToken: buyerBuyToken.address,
        sellerBuyToken: sellerBuyToken.address,
        escrowSellToken,
        buyerSellToken: buyerSellToken.address,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();
    
    // 验证余额（以原始单位）
    const buyerSellBalRaw = (
      await provider.connection.getTokenAccountBalance(buyerSellToken.address)
    ).value.amount;
    const sellerBuyBalRaw = (
      await provider.connection.getTokenAccountBalance(sellerBuyToken.address)
    ).value.amount;
    
    console.log("✅ 最小单位交易测试:");
    console.log("  买家收到原始单位:", buyerSellBalRaw);
    console.log("  卖家收到原始单位 (相当于完整代币):", sellerBuyBalRaw);
    
    // 买家应收到 3 个最小单位
    assert.equal(buyerSellBalRaw, "3", "买家应收到 3 个最小单位");
    // 卖家应收到 3 个最小单位 (因为是最小单位交易)
    assert.equal(sellerBuyBalRaw, "3", "卖家应收到 3 个最小单位的付款币");
  });
});
