import { describe, expect, it } from "vitest";
import { parseBendigoCsv } from "./csv";
import { TransactionDirection } from "@prisma/client";

describe("parseBendigoCsv", () => {
  it("parses headerless 3-column CSV", () => {
    const csv = `"09/12/2025","-27.93","DIRECT DEBIT HUBHELLO"\n"10/12/2025","55.00","PAYMENT"`;
    const rows = parseBendigoCsv(csv, "h1", "a1");
    expect(rows.length).toBe(2);
    expect(rows[0].date.getFullYear()).toBe(2025);
    expect(rows[0].direction).toBe(TransactionDirection.DEBIT);
    expect(rows[1].direction).toBe(TransactionDirection.CREDIT);
  });
});
