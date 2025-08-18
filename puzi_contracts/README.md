Ref: https://www.anchor-lang.com/docs/installation

# Puzi Contracts

## Init steps

```bash
# init project
anchor init puzi_contracts

# add dependencies
cd puzi_contracts
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
anchor deploy --provider.cluster mainnet-beta
# deploy to testnet
anchor deploy --provider.cluster testnet
# run local validator
solana-test-validator --reset
# run local validator with custom port
solana-test-validator --reset --rpc-port 8899 --websocket-port 8900
```

## 坑洞
- solana playground anchor version: v0.29.0，最新版 v0.31.0 很多不兼容的语法
    - 建议如果准备部署的合约，不要使用 playground。浅唱了解概念可以用 playground
- 开发体验
    - declare_id 还有手动运行命令，没有自动化