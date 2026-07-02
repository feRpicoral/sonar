import { describe, expect, it } from "vitest";

import type { OrgId } from "./types";
import { scopeArgsToOrg } from "./with-org";

const ORG = "org-123" as OrgId;

describe("scopeArgsToOrg", () => {
  it.each([
    "findMany",
    "findUnique",
    "update",
    "updateMany",
    "updateManyAndReturn",
    "delete",
    "deleteMany",
    "count",
    "aggregate",
    "groupBy",
  ])("injects orgId into where for %s", (op) => {
    const args: Record<string, unknown> = { where: { id: "x" } };
    scopeArgsToOrg(op, args, ORG);
    expect(args.where).toEqual({ id: "x", orgId: ORG });
  });

  it("injects orgId into data for create", () => {
    const args: Record<string, unknown> = { data: { name: "Acme" } };
    scopeArgsToOrg("create", args, ORG);
    expect(args.data).toEqual({ name: "Acme", orgId: ORG });
  });

  it("injects orgId into every row for createMany arrays", () => {
    const args: Record<string, unknown> = { data: [{ name: "a" }, { name: "b" }] };
    scopeArgsToOrg("createMany", args, ORG);
    expect(args.data).toEqual([
      { name: "a", orgId: ORG },
      { name: "b", orgId: ORG },
    ]);
  });

  it("injects orgId into both where and create for upsert", () => {
    const args: Record<string, unknown> = {
      where: { id: "x" },
      create: { name: "Acme" },
      update: { name: "Acme2" },
    };
    scopeArgsToOrg("upsert", args, ORG);
    expect(args.where).toEqual({ id: "x", orgId: ORG });
    expect(args.create).toEqual({ name: "Acme", orgId: ORG });
  });

  it("throws (fails closed) on an unrecognised operation", () => {
    expect(() => scopeArgsToOrg("someFutureOp", {}, ORG)).toThrow(/unhandled Prisma operation/);
  });
});
