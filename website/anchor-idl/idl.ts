/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/puzi_contracts.json`.
 */
export type PuziContracts = {
  address: "HBo5e3xjdjB7qtg5e87UxB6oDLCyfDdrfNWgGdPadwpQ";
  metadata: {
    name: "puzi_contracts";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "cancelListing";
      docs: ["取消卖单（退回剩余代币）"];
      discriminator: [41, 183, 50, 232, 230, 233, 157, 70];
      accounts: [
        {
          name: "seller";
          writable: true;
          signer: true;
        },
        {
          name: "listing";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 115, 116, 105, 110, 103];
              },
              {
                kind: "account";
                path: "seller";
              },
              {
                kind: "account";
                path: "listing.listing_id";
                account: "Listing";
              }
            ];
          };
        },
        {
          name: "sellerSellToken";
          writable: true;
        },
        {
          name: "escrowSellToken";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [];
    },
    {
      name: "createListing";
      docs: ["创建卖单"];
      discriminator: [18, 168, 45, 24, 191, 31, 117, 54];
      accounts: [
        {
          name: "seller";
          writable: true;
          signer: true;
        },
        {
          name: "listing";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 115, 116, 105, 110, 103];
              },
              {
                kind: "account";
                path: "seller";
              },
              {
                kind: "arg";
                path: "listing_id";
              }
            ];
          };
        },
        {
          name: "sellMint";
        },
        {
          name: "buyMint";
        },
        {
          name: "sellerSellToken";
          writable: true;
        },
        {
          name: "escrowSellToken";
          writable: true;
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "pricePerToken";
          type: "u64";
        },
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "listingId";
          type: "u64";
        }
      ];
    },
    {
      name: "purchase";
      docs: ["购买代币（支持部分成交）"];
      discriminator: [21, 93, 113, 154, 193, 160, 242, 168];
      accounts: [
        {
          name: "buyer";
          writable: true;
          signer: true;
        },
        {
          name: "listing";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 105, 115, 116, 105, 110, 103];
              },
              {
                kind: "account";
                path: "listing.seller";
                account: "Listing";
              },
              {
                kind: "account";
                path: "listing.listing_id";
                account: "Listing";
              }
            ];
          };
        },
        {
          name: "seller";
          writable: true;
        },
        {
          name: "buyerBuyToken";
          writable: true;
        },
        {
          name: "sellerBuyToken";
          writable: true;
        },
        {
          name: "escrowSellToken";
          writable: true;
        },
        {
          name: "buyerSellToken";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      args: [
        {
          name: "buyAmount";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "listing";
      discriminator: [218, 32, 50, 73, 43, 134, 26, 58];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "listingNotActive";
      msg: "卖单不活跃";
    },
    {
      code: 6001;
      name: "unauthorized";
      msg: "未授权操作";
    },
    {
      code: 6002;
      name: "invalidAmount";
      msg: "购买数量必须大于 0";
    },
    {
      code: 6003;
      name: "insufficientStock";
      msg: "库存不足";
    },
    {
      code: 6004;
      name: "insufficientFunds";
      msg: "余额不足";
    },
    {
      code: 6005;
      name: "overflow";
      msg: "数值溢出";
    }
  ];
  types: [
    {
      name: "listing";
      docs: ["卖单账户结构"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "seller";
            type: "pubkey";
          },
          {
            name: "sellMint";
            type: "pubkey";
          },
          {
            name: "buyMint";
            type: "pubkey";
          },
          {
            name: "pricePerToken";
            type: "u64";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "listingId";
            type: "u64";
          },
          {
            name: "isActive";
            type: "bool";
          },
          {
            name: "bump";
            type: "u8";
          }
        ];
      };
    }
  ];
};

export const IDL: PuziContracts = {
  address: "HBo5e3xjdjB7qtg5e87UxB6oDLCyfDdrfNWgGdPadwpQ",
  metadata: {
    name: "puzi_contracts",
    version: "0.1.0",
    spec: "0.1.0",
    description: "Created with Anchor"
  },
  instructions: [
    {
      name: "cancelListing",
      docs: ["取消卖单（退回剩余代币）"],
      discriminator: [41, 183, 50, 232, 230, 233, 157, 70],
      accounts: [
        {
          name: "seller",
          writable: true,
          signer: true
        },
        {
          name: "listing",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [108, 105, 115, 116, 105, 110, 103]
              },
              {
                kind: "account",
                path: "seller"
              },
              {
                kind: "account",
                path: "listing.listing_id",
                account: "Listing"
              }
            ]
          }
        },
        {
          name: "sellerSellToken",
          writable: true
        },
        {
          name: "escrowSellToken",
          writable: true
        },
        {
          name: "tokenProgram"
        }
      ],
      args: []
    },
    {
      name: "createListing",
      docs: ["创建卖单"],
      discriminator: [18, 168, 45, 24, 191, 31, 117, 54],
      accounts: [
        {
          name: "seller",
          writable: true,
          signer: true
        },
        {
          name: "listing",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [108, 105, 115, 116, 105, 110, 103]
              },
              {
                kind: "account",
                path: "seller"
              },
              {
                kind: "arg",
                path: "listing_id"
              }
            ]
          }
        },
        {
          name: "sellMint"
        },
        {
          name: "buyMint"
        },
        {
          name: "sellerSellToken",
          writable: true
        },
        {
          name: "escrowSellToken",
          writable: true
        },
        {
          name: "tokenProgram"
        },
        {
          name: "associatedTokenProgram",
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          name: "systemProgram",
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "pricePerToken",
          type: "u64"
        },
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "listingId",
          type: "u64"
        }
      ]
    },
    {
      name: "purchase",
      docs: ["购买代币（支持部分成交）"],
      discriminator: [21, 93, 113, 154, 193, 160, 242, 168],
      accounts: [
        {
          name: "buyer",
          writable: true,
          signer: true
        },
        {
          name: "listing",
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [108, 105, 115, 116, 105, 110, 103]
              },
              {
                kind: "account",
                path: "listing.seller",
                account: "Listing"
              },
              {
                kind: "account",
                path: "listing.listing_id",
                account: "Listing"
              }
            ]
          }
        },
        {
          name: "seller",
          writable: true
        },
        {
          name: "buyerBuyToken",
          writable: true
        },
        {
          name: "sellerBuyToken",
          writable: true
        },
        {
          name: "escrowSellToken",
          writable: true
        },
        {
          name: "buyerSellToken",
          writable: true
        },
        {
          name: "tokenProgram",
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "buyAmount",
          type: "u64"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "listing",
      discriminator: [218, 32, 50, 73, 43, 134, 26, 58]
    }
  ],
  errors: [
    {
      code: 6000,
      name: "listingNotActive",
      msg: "卖单不活跃"
    },
    {
      code: 6001,
      name: "unauthorized",
      msg: "未授权操作"
    },
    {
      code: 6002,
      name: "invalidAmount",
      msg: "购买数量必须大于 0"
    },
    {
      code: 6003,
      name: "insufficientStock",
      msg: "库存不足"
    },
    {
      code: 6004,
      name: "insufficientFunds",
      msg: "余额不足"
    },
    {
      code: 6005,
      name: "overflow",
      msg: "数值溢出"
    }
  ],
  types: [
    {
      name: "listing",
      docs: ["卖单账户结构"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "seller",
            type: "pubkey"
          },
          {
            name: "sellMint",
            type: "pubkey"
          },
          {
            name: "buyMint",
            type: "pubkey"
          },
          {
            name: "pricePerToken",
            type: "u64"
          },
          {
            name: "amount",
            type: "u64"
          },
          {
            name: "listingId",
            type: "u64"
          },
          {
            name: "isActive",
            type: "bool"
          },
          {
            name: "bump",
            type: "u8"
          }
        ]
      }
    }
  ]
};