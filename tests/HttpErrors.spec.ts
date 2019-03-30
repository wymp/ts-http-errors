import "mocha";
import { assert } from "chai";
import * as errors from "../src/index";

describe("InternalServerError", () => {
  it("should have correct data", function() {
    const msg = "Something happened!";
    const e = new errors.InternalServerError(msg);
    assert.equal("InternalServerError", e.name);
    assert.equal(msg, e.message);
    assert.equal(500, e.status);
    assert.equal("HTTP_INTERNAL_SERVER_ERROR", e.code);
  });

  it("should accept a subcode that is publicly accessible", function() {
    const e = new errors.InternalServerError("Test error!", "test");
    assert.equal("test", e.subcode);
  });
});

describe("fromError static method", () => {
  const msg = "Test error";
  const error = new Error(msg);
  it("should instantiate whatever class it's used on", function() {
    let e: errors.HttpError = errors.InternalServerError.fromError(error);
    assert.equal("InternalServerError", e.name);
    assert.equal(msg, e.message);
    assert.equal(500, e.status);
    assert.equal("HTTP_INTERNAL_SERVER_ERROR", e.code);

    e = errors.BadGateway.fromError(error);
    assert.equal("BadGateway", e.name);
    assert.equal(msg, e.message);
    assert.equal(502, e.status);
    assert.equal("HTTP_BAD_GATEWAY", e.code);
  });
});

describe("isHttpError", () => {
  it("should typeguard correctly", function() {
    [ new errors.InternalServerError("Test error"), new Error("Test error") ].forEach(function(error) {
      try {
        throw error;
      } catch (e) {
        if (!errors.isHttpError(e)) {
          e = errors.InternalServerError.fromError(e);
        }

        assert.equal("InternalServerError", e.name);
        assert.equal(500, e.status);
      }
    });
  });
});

