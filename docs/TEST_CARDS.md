The payments transactions create page doesn't list sandbox card numbers. The stablecoin sandbox guides do.

**Headless testing** (any 3-digit CVV, any future expiry):

- Visa debit: 4111 1111 1111 1111
- Visa credit: 4242 4242 4242 4242
- Mastercard debit: 5252 5252 5252 5258
- Mastercard credit: 5555 5555 5555 4444

**Declines:**

- Generic decline, Visa: 4000 0000 0000 0002
- Generic decline, Mastercard: 5100 0000 0000 0008

Each provider has its own test cards. For example, Transak accepts Visa 4111 1111 1111 1111 with expiry 10/33 and CVV 123.

Sources: [Headless testing](/docs/stablecoins/sandbox-guide/headless-testing) and [White-label and Checkout testing credentials](/docs/stablecoins/sandbox-guide/test).

```suggestions
(Headless Card and Apple Pay Testing)[/docs/stablecoins/sandbox-guide/headless-testing]
(Testing credentials by provider)[/docs/stablecoins/sandbox-guide/test]
```
