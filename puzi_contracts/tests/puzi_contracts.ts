import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import assert from "assert";
import * as anchor from "@coral-xyz/anchor";
const { BN } = anchor.default;

describe("spl_marketplace test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.PuziContracts;

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
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
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
    console.log("is_active:", listingAccount.isActive);
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
      associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
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
    active: listingAccount1.isActive,
  });

  console.log("卖单2:", {
    amount: listingAccount2.amount.toString(),
    price: listingAccount2.pricePerToken.toString(),
    active: listingAccount2.isActive,
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
      active: l.account.isActive,
    });
  });

  // 断言有 2 个卖单
  assert.equal(sellerListings.length, 2, "卖家应有 2 个卖单");
});
});
