# POS Bug Reports

---

### [BUG] Lỗi 500 khi Thanh toán Công nợ (Checkout) cho Đại lý/Đối tác

- **API:** `POST /v1/pos/checkout`
- **Vấn đề cụ thể:**
  - Khi thực hiện thanh toán bằng hình thức công nợ (`method: "cong_no"`) cho Đại lý (`agentType: "agent"`), server backend trả về lỗi **500 Internal Server Error**.
- **Payload yêu cầu (Request Payload):**
  ```json
  {
    "cashSessionId": "019ef38f-1088-78be-8a37-258ccd2992ee",
    "customerId": null,
    "currency": "VND",
    "notes": null,
    "lines": [
      {
        "variantId": "019ef30c-fc08-7d47-926f-81f3653c4deb",
        "unitId": "00000000-0000-0000-0000-000000000010",
        "qty": 1,
        "unitPrice": 100000,
        "discountAmount": 0,
        "taxRate": 8
      }
    ],
    "payments": [
      {
        "method": "cong_no",
        "amount": 108000,
        "provider": null,
        "cardTerminalId": null
      }
    ],
    "voucherCode": null,
    "issueInvoice": false,
    "customerName": null,
    "customerTaxId": null,
    "customerAddress": null,
    "affiliateId": null,
    "partnerId": "019f113a-8dd3-757e-8181-f4b2d61c29ca",
    "clientIdempotencyKey": "checkout-1782958505354-fiaukb7ar24",
    "agentType": "agent"
  }
  ```
- **Phản hồi lỗi (Error Response):**
  ```json
  {
    "error": "23514: new row for relation \"debt_entries\" violates check constraint \"debt_entries_partner_type_check\"\n\nDETAIL: Detail redacted as it may contain sensitive data. Specify 'Include Error Detail' in the connection string to include this information.",
    "stack": "   at Npgsql.Internal.NpgsqlConnector.ReadMessageLong(Boolean async, DataRowLoadingMode dataRowLoadingMode, Boolean readingNotifications, Boolean isReadingPrependedMessage)\n   at System.Runtime.CompilerServices.PoolingAsyncValueTaskMethodBuilder`1.StateMachineBox`1.System.Threading.Tasks.Sources.IValueTaskSource<TResult>.GetResult(Int16 token)     \n   at Npgsql.NpgsqlDataReader.NextResult(Boolean async, Boolean isConsuming, CancellationToken cancellationToken)\n   at Npgsql.NpgsqlDataReader.NextResult(Boolean async, Boolean isConsuming, CancellationToken cancellationToken)\n   at Npgsql.NpgsqlCommand.ExecuteReader(Boolean async, CommandBehavior behavior, CancellationToken cancellationToken)\n   at Npgsql.NpgsqlCommand.ExecuteReader(Boolean async, CommandBehavior behavior, CancellationToken cancellationToken)\n   at Npgsql.NpgsqlCommand.ExecuteNonQuery(Boolean async, CancellationToken cancellationToken)\n   at Dapper.SqlMapper.ExecuteImplAsync(IDbConnection cnn, CommandDefinition command, Object "
  }
  ```
