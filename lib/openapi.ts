export const openApiSpec = {
  "openapi": "3.0.3",
  "info": {
    "title": "Fin-Techno API",
    "version": "1.0.0",
    "description": "REST API untuk aplikasi manajemen keuangan Fin-Techno. Semua endpoint (kecuali auth) memerlukan header Authorization: Bearer token."
  },
  "servers": [
    {
      "url": "http://localhost:3000",
      "description": "Local"
    },
    {
      "url": "https://fin-techno.vercel.app",
      "description": "Production"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "properties": {
          "message": {
            "type": "string"
          }
        }
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "paths": {
    "/api/auth/register": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Register user baru",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "email",
                  "password"
                ],
                "properties": {
                  "name": {
                    "type": "string",
                    "example": "Budi Santoso"
                  },
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "budi@example.com"
                  },
                  "password": {
                    "type": "string",
                    "minLength": 6,
                    "example": "password123"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Berhasil register",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "message": {
                      "type": "string"
                    },
                    "data": {
                      "type": "object",
                      "properties": {
                        "token": {
                          "type": "string"
                        },
                        "role": {
                          "type": "string"
                        },
                        "name": {
                          "type": "string"
                        },
                        "id": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request"
          }
        }
      }
    },
    "/api/auth/login": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Login dengan email & password",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email",
                  "password"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email"
                  },
                  "password": {
                    "type": "string"
                  },
                  "checkOnly": {
                    "type": "boolean",
                    "description": "Hanya validasi credentials tanpa return token"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login berhasil"
          },
          "401": {
            "description": "Credentials salah"
          }
        }
      }
    },
    "/api/auth/send-otp": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Kirim OTP ke email",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email",
                  "purpose"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email"
                  },
                  "purpose": {
                    "type": "string",
                    "enum": [
                      "login",
                      "register",
                      "change-password",
                      "oauth"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP terkirim"
          }
        }
      }
    },
    "/api/auth/verify-otp": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Verifikasi OTP",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email",
                  "code",
                  "purpose"
                ],
                "properties": {
                  "email": {
                    "type": "string"
                  },
                  "code": {
                    "type": "string"
                  },
                  "purpose": {
                    "type": "string",
                    "enum": [
                      "login",
                      "register",
                      "change-password",
                      "oauth"
                    ]
                  },
                  "name": {
                    "type": "string"
                  },
                  "password": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP valid"
          },
          "400": {
            "description": "OTP tidak valid"
          }
        }
      }
    },
    "/api/transactions": {
      "get": {
        "tags": [
          "Transactions"
        ],
        "summary": "List transaksi (bank + wallet)",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 10,
              "maximum": 500
            }
          },
          {
            "name": "type",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "CREDIT",
                "DEBIT"
              ],
              "default": "ALL"
            }
          },
          {
            "name": "source",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "BANK",
                "WALLET"
              ],
              "default": "ALL"
            }
          },
          {
            "name": "dateFrom",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "dateTo",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "search",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "category",
            "in": "query",
            "schema": {
              "type": "string",
              "description": "Category ID"
            }
          },
          {
            "name": "accountId",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List transaksi",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "transactions": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "source": {
                            "type": "string",
                            "enum": [
                              "BANK",
                              "WALLET"
                            ]
                          },
                          "date": {
                            "type": "string",
                            "format": "date"
                          },
                          "description": {
                            "type": "string"
                          },
                          "type": {
                            "type": "string",
                            "enum": [
                              "CREDIT",
                              "DEBIT"
                            ]
                          },
                          "amount": {
                            "type": "number"
                          },
                          "balance": {
                            "type": "number",
                            "nullable": true
                          },
                          "accountName": {
                            "type": "string"
                          },
                          "provider": {
                            "type": "string"
                          },
                          "categories": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "name": {
                                  "type": "string"
                                },
                                "code": {
                                  "type": "string"
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    "total": {
                      "type": "integer"
                    },
                    "page": {
                      "type": "integer"
                    },
                    "totalPages": {
                      "type": "integer"
                    },
                    "summary": {
                      "type": "object",
                      "properties": {
                        "totalCredit": {
                          "type": "number"
                        },
                        "totalDebit": {
                          "type": "number"
                        },
                        "netFlow": {
                          "type": "number"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized"
          }
        }
      }
    },
    "/api/bank-accounts": {
      "get": {
        "tags": [
          "Bank Accounts"
        ],
        "summary": "List rekening bank",
        "responses": {
          "200": {
            "description": "List rekening bank"
          },
          "401": {
            "description": "Unauthorized"
          }
        }
      },
      "post": {
        "tags": [
          "Bank Accounts"
        ],
        "summary": "Tambah rekening bank",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "bankProvider",
                  "accountNumber",
                  "accountName"
                ],
                "properties": {
                  "bankProvider": {
                    "type": "string",
                    "example": "BRI"
                  },
                  "accountNumber": {
                    "type": "string"
                  },
                  "accountName": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Rekening berhasil ditambahkan"
          },
          "409": {
            "description": "Nomor rekening sudah terdaftar"
          }
        }
      }
    },
    "/api/bank-accounts/{id}": {
      "get": {
        "tags": [
          "Bank Accounts"
        ],
        "summary": "Detail rekening bank",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detail rekening"
          },
          "404": {
            "description": "Tidak ditemukan"
          }
        }
      },
      "put": {
        "tags": [
          "Bank Accounts"
        ],
        "summary": "Update rekening bank",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "accountName": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Berhasil diupdate"
          }
        }
      },
      "delete": {
        "tags": [
          "Bank Accounts"
        ],
        "summary": "Hapus rekening bank",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Berhasil dihapus"
          }
        }
      }
    },
    "/api/wallets": {
      "get": {
        "tags": [
          "Wallets"
        ],
        "summary": "List dompet digital",
        "responses": {
          "200": {
            "description": "List dompet digital"
          },
          "401": {
            "description": "Unauthorized"
          }
        }
      },
      "post": {
        "tags": [
          "Wallets"
        ],
        "summary": "Tambah dompet digital",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "walletProvider",
                  "phoneNumber",
                  "accountName"
                ],
                "properties": {
                  "walletProvider": {
                    "type": "string",
                    "example": "GOPAY"
                  },
                  "phoneNumber": {
                    "type": "string"
                  },
                  "accountName": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Dompet berhasil ditambahkan"
          }
        }
      }
    },
    "/api/wallets/{id}": {
      "get": {
        "tags": [
          "Wallets"
        ],
        "summary": "Detail dompet digital",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detail dompet"
          }
        }
      },
      "put": {
        "tags": [
          "Wallets"
        ],
        "summary": "Update dompet digital",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "accountName": {
                    "type": "string"
                  },
                  "isActive": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Berhasil diupdate"
          }
        }
      },
      "delete": {
        "tags": [
          "Wallets"
        ],
        "summary": "Hapus dompet digital",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Berhasil dihapus"
          }
        }
      }
    },
    "/api/categories": {
      "get": {
        "tags": [
          "Categories"
        ],
        "summary": "List kategori transaksi",
        "responses": {
          "200": {
            "description": "List kategori"
          }
        }
      },
      "post": {
        "tags": [
          "Categories"
        ],
        "summary": "Tambah kategori",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "code"
                ],
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "code": {
                    "type": "string"
                  },
                  "color": {
                    "type": "string"
                  },
                  "icon": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Kategori berhasil ditambahkan"
          }
        }
      }
    },
    "/api/categories/{id}": {
      "put": {
        "tags": [
          "Categories"
        ],
        "summary": "Update kategori",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "code": {
                    "type": "string"
                  },
                  "color": {
                    "type": "string"
                  },
                  "icon": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Berhasil diupdate"
          }
        }
      },
      "delete": {
        "tags": [
          "Categories"
        ],
        "summary": "Hapus kategori",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Berhasil dihapus"
          }
        }
      }
    },
    "/api/categories/reassign": {
      "post": {
        "tags": [
          "Categories"
        ],
        "summary": "Reassign kategori ke transaksi",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "transactionId",
                  "categoryId",
                  "source"
                ],
                "properties": {
                  "transactionId": {
                    "type": "string"
                  },
                  "categoryId": {
                    "type": "string"
                  },
                  "source": {
                    "type": "string",
                    "enum": [
                      "BANK",
                      "WALLET"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Berhasil reassign"
          }
        }
      }
    },
    "/api/upload/submit": {
      "post": {
        "tags": [
          "Upload"
        ],
        "summary": "Submit e-statement file (multipart)",
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": [
                  "file",
                  "accountId",
                  "source"
                ],
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  },
                  "accountId": {
                    "type": "string"
                  },
                  "source": {
                    "type": "string",
                    "enum": [
                      "BANK",
                      "WALLET"
                    ]
                  },
                  "periodStart": {
                    "type": "string",
                    "format": "date"
                  },
                  "periodEnd": {
                    "type": "string",
                    "format": "date"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "File berhasil diupload"
          },
          "400": {
            "description": "Bad request"
          }
        }
      }
    },
    "/api/upload/process": {
      "post": {
        "tags": [
          "Upload"
        ],
        "summary": "Proses parsing e-statement",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "uploadId"
                ],
                "properties": {
                  "uploadId": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Parsing berhasil"
          }
        }
      }
    },
    "/api/upload/list": {
      "get": {
        "tags": [
          "Upload"
        ],
        "summary": "List riwayat upload",
        "parameters": [
          {
            "name": "source",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "BANK",
                "WALLET"
              ],
              "default": "ALL"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 10
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List upload"
          }
        }
      }
    },
    "/api/upload/accounts": {
      "get": {
        "tags": [
          "Upload"
        ],
        "summary": "List akun untuk upload",
        "responses": {
          "200": {
            "description": "List akun"
          }
        }
      }
    },
    "/api/upload/{id}": {
      "delete": {
        "tags": [
          "Upload"
        ],
        "summary": "Hapus upload",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Berhasil dihapus"
          }
        }
      }
    },
    "/api/dashboard/metrics": {
      "get": {
        "tags": [
          "Dashboard"
        ],
        "summary": "Metrik keuangan (income, expense, net)",
        "parameters": [
          {
            "name": "dateFrom",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "dateTo",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "source",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "BANK",
                "WALLET"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Metrik dashboard"
          }
        }
      }
    },
    "/api/dashboard/transactions": {
      "get": {
        "tags": [
          "Dashboard"
        ],
        "summary": "Transaksi terbaru untuk dashboard",
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 5
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Transaksi terbaru"
          }
        }
      }
    },
    "/api/dashboard/cashflow": {
      "get": {
        "tags": [
          "Dashboard"
        ],
        "summary": "Data cashflow untuk chart",
        "parameters": [
          {
            "name": "dateFrom",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "dateTo",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "groupBy",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "day",
                "week",
                "month"
              ],
              "default": "month"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Data cashflow"
          }
        }
      }
    },
    "/api/dashboard/accounts": {
      "get": {
        "tags": [
          "Dashboard"
        ],
        "summary": "Ringkasan akun untuk dashboard",
        "responses": {
          "200": {
            "description": "Ringkasan akun"
          }
        }
      }
    },
    "/api/reports/expense": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Laporan pengeluaran per kategori",
        "parameters": [
          {
            "name": "dateFrom",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "dateTo",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "source",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "BANK",
                "WALLET"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Laporan pengeluaran"
          }
        }
      }
    },
    "/api/reports/income": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Laporan pemasukan per kategori",
        "parameters": [
          {
            "name": "dateFrom",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "dateTo",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "name": "source",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "BANK",
                "WALLET"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Laporan pemasukan"
          }
        }
      }
    },
    "/api/reports/period": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Laporan per periode (bulanan/tahunan)",
        "parameters": [
          {
            "name": "year",
            "in": "query",
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "source",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": [
                "ALL",
                "BANK",
                "WALLET"
              ]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Laporan periode"
          }
        }
      }
    },
    "/api/calendar": {
      "get": {
        "tags": [
          "Calendar"
        ],
        "summary": "Data transaksi untuk kalender (bulanan)",
        "parameters": [
          {
            "name": "year",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer"
            }
          },
          {
            "name": "month",
            "in": "query",
            "required": true,
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 12
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Data kalender"
          }
        }
      }
    },
    "/api/calendar/{date}": {
      "get": {
        "tags": [
          "Calendar"
        ],
        "summary": "Transaksi pada tanggal tertentu",
        "parameters": [
          {
            "name": "date",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "format": "date",
              "example": "2026-03-15"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Transaksi pada tanggal tersebut"
          }
        }
      }
    },
    "/api/notifications": {
      "get": {
        "tags": [
          "Notifications"
        ],
        "summary": "List notifikasi",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 20
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List notifikasi"
          }
        }
      },
      "post": {
        "tags": [
          "Notifications"
        ],
        "summary": "Tandai notifikasi sebagai dibaca",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "id": {
                    "type": "string",
                    "description": "ID notifikasi, kosong untuk mark all read"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Berhasil"
          }
        }
      }
    },
    "/api/notifications/stream": {
      "get": {
        "tags": [
          "Notifications"
        ],
        "summary": "SSE stream untuk notifikasi real-time",
        "description": "Server-Sent Events endpoint. Gunakan EventSource di client.",
        "responses": {
          "200": {
            "description": "SSE stream aktif"
          }
        }
      }
    },
    "/api/user": {
      "get": {
        "tags": [
          "User"
        ],
        "summary": "Get profil user yang sedang login",
        "responses": {
          "200": {
            "description": "Data user"
          }
        }
      },
      "put": {
        "tags": [
          "User"
        ],
        "summary": "Update profil user",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "email": {
                    "type": "string",
                    "format": "email"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Profil berhasil diupdate"
          }
        }
      }
    },
    "/api/user/profile": {
      "put": {
        "tags": [
          "User"
        ],
        "summary": "Update profil lengkap (nama, email, password)",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "email": {
                    "type": "string"
                  },
                  "currentPassword": {
                    "type": "string"
                  },
                  "newPassword": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Berhasil diupdate"
          }
        }
      }
    },
    "/api/user/avatar": {
      "post": {
        "tags": [
          "User"
        ],
        "summary": "Upload avatar user",
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Avatar berhasil diupload"
          }
        }
      }
    },
    "/api/user/avatar-url": {
      "get": {
        "tags": [
          "User"
        ],
        "summary": "Get signed URL avatar",
        "responses": {
          "200": {
            "description": "URL avatar"
          }
        }
      }
    },
    "/api/ai/chat": {
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Chat dengan AI financial assistant",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "message"
                ],
                "properties": {
                  "message": {
                    "type": "string",
                    "example": "Berapa total pengeluaran saya bulan ini?"
                  },
                  "history": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "role": {
                          "type": "string",
                          "enum": [
                            "user",
                            "model"
                          ]
                        },
                        "parts": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "text": {
                                "type": "string"
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Respons AI",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "reply": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "AI error"
          }
        }
      }
    },
    "/api/ai/analyze": {
      "post": {
        "tags": [
          "AI"
        ],
        "summary": "Analisis keuangan otomatis dengan AI",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "dateFrom": {
                    "type": "string",
                    "format": "date"
                  },
                  "dateTo": {
                    "type": "string",
                    "format": "date"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Hasil analisis AI",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "analysis": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
