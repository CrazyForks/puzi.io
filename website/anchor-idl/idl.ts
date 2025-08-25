export type Puzi = {
  "address": "4DqAA2N7V8Bun7zhQssuhGuZNxncLBGK5bV3gWiV2TQk",
  "metadata": {
    "name": "puzi",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancel_listing",
      "discriminator": [
        41,
        183,
        50,
        232,
        230,
        233,
        157,
        70
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "Listing"
              }
            ]
          }
        },
        {
          "name": "sell_mint"
        },
        {
          "name": "seller_sell_token",
          "writable": true
        },
        {
          "name": "escrow_sell_token",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "create_listing",
      "discriminator": [
        18,
        168,
        45,
        24,
        191,
        31,
        117,
        54
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "arg",
                "path": "listing_id"
              }
            ]
          }
        },
        {
          "name": "sell_mint"
        },
        {
          "name": "buy_mint"
        },
        {
          "name": "seller_sell_token",
          "writable": true
        },
        {
          "name": "escrow_sell_token",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "listing"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "sell_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "price_per_token",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "listing_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "purchase",
      "discriminator": [
        21,
        93,
        113,
        154,
        193,
        160,
        242,
        168
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "listing.seller",
                "account": "Listing"
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "Listing"
              }
            ]
          }
        },
        {
          "name": "seller",
          "docs": [
            "Seller account must match the one in listing"
          ],
          "writable": true
        },
        {
          "name": "sell_mint"
        },
        {
          "name": "buy_mint"
        },
        {
          "name": "buyer_buy_token",
          "writable": true
        },
        {
          "name": "seller_buy_token",
          "writable": true
        },
        {
          "name": "escrow_sell_token",
          "writable": true
        },
        {
          "name": "buyer_sell_token",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "buy_amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Listing",
      "discriminator": [
        218,
        32,
        50,
        73,
        43,
        134,
        26,
        58
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ListingNotActive",
      "msg": "1"
    },
    {
      "code": 6001,
      "name": "Unauthorized",
      "msg": "2"
    },
    {
      "code": 6002,
      "name": "InvalidAmount",
      "msg": "3"
    },
    {
      "code": 6003,
      "name": "InvalidPrice",
      "msg": "4"
    },
    {
      "code": 6004,
      "name": "InsufficientStock",
      "msg": "5"
    },
    {
      "code": 6005,
      "name": "Overflow",
      "msg": "6"
    },
    {
      "code": 6006,
      "name": "InvalidMint",
      "msg": "7"
    },
    {
      "code": 6007,
      "name": "InvalidOwner",
      "msg": "8"
    },
    {
      "code": 6008,
      "name": "InvalidSeller",
      "msg": "9"
    }
  ],
  "types": [
    {
      "name": "Listing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "sell_mint",
            "type": "pubkey"
          },
          {
            "name": "buy_mint",
            "type": "pubkey"
          },
          {
            "name": "price_per_token",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "listing_id",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};

export const IDL: Puzi = {
  "address": "4DqAA2N7V8Bun7zhQssuhGuZNxncLBGK5bV3gWiV2TQk",
  "metadata": {
    "name": "puzi",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancel_listing",
      "discriminator": [
        41,
        183,
        50,
        232,
        230,
        233,
        157,
        70
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "Listing"
              }
            ]
          }
        },
        {
          "name": "sell_mint"
        },
        {
          "name": "seller_sell_token",
          "writable": true
        },
        {
          "name": "escrow_sell_token",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "create_listing",
      "discriminator": [
        18,
        168,
        45,
        24,
        191,
        31,
        117,
        54
      ],
      "accounts": [
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "arg",
                "path": "listing_id"
              }
            ]
          }
        },
        {
          "name": "sell_mint"
        },
        {
          "name": "buy_mint"
        },
        {
          "name": "seller_sell_token",
          "writable": true
        },
        {
          "name": "escrow_sell_token",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "listing"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "sell_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "price_per_token",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "listing_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "purchase",
      "discriminator": [
        21,
        93,
        113,
        154,
        193,
        160,
        242,
        168
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "listing",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  115,
                  116,
                  105,
                  110,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "listing.seller",
                "account": "Listing"
              },
              {
                "kind": "account",
                "path": "listing.listing_id",
                "account": "Listing"
              }
            ]
          }
        },
        {
          "name": "seller",
          "docs": [
            "Seller account must match the one in listing"
          ],
          "writable": true
        },
        {
          "name": "sell_mint"
        },
        {
          "name": "buy_mint"
        },
        {
          "name": "buyer_buy_token",
          "writable": true
        },
        {
          "name": "seller_buy_token",
          "writable": true
        },
        {
          "name": "escrow_sell_token",
          "writable": true
        },
        {
          "name": "buyer_sell_token",
          "writable": true
        },
        {
          "name": "token_program",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "buy_amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "Listing",
      "discriminator": [
        218,
        32,
        50,
        73,
        43,
        134,
        26,
        58
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ListingNotActive",
      "msg": "1"
    },
    {
      "code": 6001,
      "name": "Unauthorized",
      "msg": "2"
    },
    {
      "code": 6002,
      "name": "InvalidAmount",
      "msg": "3"
    },
    {
      "code": 6003,
      "name": "InvalidPrice",
      "msg": "4"
    },
    {
      "code": 6004,
      "name": "InsufficientStock",
      "msg": "5"
    },
    {
      "code": 6005,
      "name": "Overflow",
      "msg": "6"
    },
    {
      "code": 6006,
      "name": "InvalidMint",
      "msg": "7"
    },
    {
      "code": 6007,
      "name": "InvalidOwner",
      "msg": "8"
    },
    {
      "code": 6008,
      "name": "InvalidSeller",
      "msg": "9"
    }
  ],
  "types": [
    {
      "name": "Listing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "sell_mint",
            "type": "pubkey"
          },
          {
            "name": "buy_mint",
            "type": "pubkey"
          },
          {
            "name": "price_per_token",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "listing_id",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
