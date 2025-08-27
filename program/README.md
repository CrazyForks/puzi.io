

# Puzi Program

## Refs
- https://www.anchor-lang.com/docs/installation

## Init steps

```bash
# init project
anchor init puzi

# add dependencies
cd program
cargo add anchor-spl


# sync program id ref: https://www.anchor-lang.com/docs/basics/program-structure#declare_id-macro
anchor keys sync

```


## Commands

```bash
# build
anchor build

# test
anchor test

# deploy to localnet
anchor deploy # anchor deploy --provider.cluster localnet

# deploy to devnet
anchor deploy --provider.cluster devnet
# deploy to mainnet
anchor deploy --provider.cluster mainnet
# deploy to testnet
anchor deploy --provider.cluster testnet
# run local validator
solana-test-validator --reset
# run local validator with custom port
solana-test-validator --reset --rpc-port 8899 --websocket-port 8900
```

### 部署失败，使用 buffer 部署
```bash
# 步骤 1: 创建 buffer 并写入程序
solana program write-buffer target/deploy/puzi.so \
  --url https://api.devnet.solana.com \
  --keypair ~/.config/solana/id.json

# 这会输出类似: Buffer: 7VQR9CcKQF2FyQBizHd5D5pFzrXwYvgZ6RfqHr5x3Z3K

# 步骤 2: 获取你的程序 ID
anchor keys list
# 或者
solana address -k target/deploy/puzi-keypair.json

# 步骤 3: 使用 buffer 部署到程序地址
solana program deploy \
  --url https://api.devnet.solana.com \
  --keypair ~/.config/solana/id.json \
  --program-id target/deploy/puzi-keypair.json \
  --buffer <上面获得的Buffer地址>

# 部署成功后，手动关闭 buffer 回收 SOL
solana program close <BUFFER_ADDRESS> \
  --keypair ~/.config/solana/id.json

# 这会退还大约 2.5 SOL（取决于程序大小）

# 查看你拥有的所有 buffers
solana program show --buffers \
  --keypair ~/.config/solana/id.json

# 查看特定 buffer 详情
solana program show <BUFFER_ADDRESS>
```

### Devnet faucet 

- usdc dev: https://spl-token-faucet.com/?token-name=USDC-Dev
- sol
  - https://faucet.solana.com/
  - solana airdrop 5 --url devnet

## 坑洞
- solana playground anchor version: v0.29.0，最新版 v0.31.0 很多不兼容的语法
    - 建议如果准备部署的合约，不要使用 playground。浅唱了解概念可以用 playground
- 开发体验
    - declare_id 还有手动运行命令，没有自动化
- 部署到mainnet 不给小费有点难，还好通过 buffer 上传可以断点重连
  ```
   solana program write-buffer target/deploy/puzi.so \
    --url https://mainnet.helius-rpc.com/\?api-key\=**** \        
    --keypair ~/.config/solana/id.json
  Blockhash expired. 4 retries remaining
  Blockhash expired. 3 retries remaining
  Blockhash expired. 2 retries remaining
  Blockhash expired. 1 retries remaining
  Blockhash expired. 0 retries remaining
  ```


