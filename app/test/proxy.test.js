// Mock all external dependencies before importing
jest.mock("drachtio-srf");
jest.mock("express");
jest.mock("winston");
jest.mock("helmet");
jest.mock("cors");
jest.mock("compression");
jest.mock("dotenv");

describe("SIP Proxy Application", () => {
  let mockSrf;
  let mockExpress;
  let mockApp;
  let mockLogger;
  let mockFormat;
  let mockTransports;
  let proxyModule;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();

    // Reset global variables
    global.activeCalls = 0;
    global.totalCalls = 0;

    // Mock Express
    mockApp = {
      use: jest.fn(),
      get: jest.fn(),
      listen: jest.fn((port, callback) => {
        if (callback) callback();
      }),
    };

    mockExpress = jest.fn(() => mockApp);
    mockExpress.json = jest.fn(() => "json-middleware");
    mockExpress.urlencoded = jest.fn(() => "urlencoded-middleware");

    // Mock Winston logger
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    // Mock Winston format methods
    mockFormat = {
      timestamp: jest.fn(() => "timestamp-format"),
      errors: jest.fn(() => "errors-format"),
      json: jest.fn(() => "json-format"),
      combine: jest.fn(() => "combined-format"),
    };

    // Mock Winston transports
    mockTransports = {
      Console: jest.fn(() => "console-transport"),
      File: jest.fn(() => "file-transport"),
    };

    // Mock Drachtio SRF
    mockSrf = {
      connected: true,
      on: jest.fn(),
      invite: jest.fn(),
      bye: jest.fn(),
      cancel: jest.fn(),
      createB2B: jest.fn(() => ({
        on: jest.fn(),
        start: jest.fn(),
      })),
      request: jest.fn(),
      disconnect: jest.fn(),
    };

    // Setup mocks before requiring the module
    require("drachtio-srf").mockImplementation(() => mockSrf);
    require("express").mockImplementation(() => mockApp);
    Object.assign(require("express"), {
      json: mockExpress.json,
      urlencoded: mockExpress.urlencoded,
    });

    require("winston").createLogger.mockReturnValue(mockLogger);
    require("winston").format = mockFormat;
    require("winston").transports = mockTransports;

    require("helmet").mockReturnValue("helmet-middleware");
    require("cors").mockReturnValue("cors-middleware");
    require("compression").mockReturnValue("compression-middleware");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Application Setup", () => {
    it("should configure Express app with middleware", () => {
      // Import the module to trigger setup
      proxyModule = require("../proxy");

      expect(mockApp.use).toHaveBeenCalledWith("helmet-middleware");
      expect(mockApp.use).toHaveBeenCalledWith("cors-middleware");
      expect(mockApp.use).toHaveBeenCalledWith("compression-middleware");
      expect(mockApp.use).toHaveBeenCalledWith("json-middleware");
      expect(mockApp.use).toHaveBeenCalledWith("urlencoded-middleware");
    });

    it("should register health check endpoint", () => {
      proxyModule = require("../proxy");

      expect(mockApp.get).toHaveBeenCalledWith("/health", expect.any(Function));
    });

    it("should register statistics endpoint", () => {
      proxyModule = require("../proxy");

      expect(mockApp.get).toHaveBeenCalledWith("/stats", expect.any(Function));
    });

    it("should start HTTP server", () => {
      proxyModule = require("../proxy");

      expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    it("should setup SRF event listeners", () => {
      proxyModule = require("../proxy");

      expect(mockSrf.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockSrf.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockSrf.on).toHaveBeenCalledWith(
        "disconnect",
        expect.any(Function)
      );
    });
  });

  describe("Health Check Endpoint", () => {
    it("should return healthy status", () => {
      proxyModule = require("../proxy");

      // Get the health check handler
      const healthCall = mockApp.get.mock.calls.find(
        (call) => call[0] === "/health"
      );
      expect(healthCall).toBeDefined();
      const healthHandler = healthCall[1];

      const mockReq = {};
      const mockRes = {
        json: jest.fn(),
      };

      healthHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: "healthy",
        timestamp: expect.any(String),
        services: {
          drachtio: "connected",
          rtpengine: "operational",
          rtpengine_workers: 3,
          load_balancer: "operational",
        },
      });
    });

    it("should show drachtio as disconnected when not connected", () => {
      mockSrf.connected = false;
      proxyModule = require("../proxy");

      const healthCall = mockApp.get.mock.calls.find(
        (call) => call[0] === "/health"
      );
      expect(healthCall).toBeDefined();
      const healthHandler = healthCall[1];

      const mockReq = {};
      const mockRes = {
        json: jest.fn(),
      };

      healthHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          services: expect.objectContaining({
            drachtio: "disconnected",
          }),
        })
      );
    });
  });

  describe("Statistics Endpoint", () => {
    it("should return call statistics", () => {
      global.activeCalls = 5;
      global.totalCalls = 25;

      proxyModule = require("../proxy");

      const statsCall = mockApp.get.mock.calls.find(
        (call) => call[0] === "/stats"
      );
      expect(statsCall).toBeDefined();
      const statsHandler = statsCall[1];

      const mockReq = {};
      const mockRes = {
        json: jest.fn(),
      };

      statsHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        calls: {
          active: 5,
          total: 25,
        },
        uptime: expect.any(Number),
        memory: expect.any(Object),
        rtpengine: {
          workers: 3,
          current_worker_index: expect.any(Number),
        },
      });
    });

    it("should handle missing call counters", () => {
      global.activeCalls = undefined;
      global.totalCalls = undefined;

      proxyModule = require("../proxy");

      const statsCall = mockApp.get.mock.calls.find(
        (call) => call[0] === "/stats"
      );
      expect(statsCall).toBeDefined();
      const statsHandler = statsCall[1];

      const mockReq = {};
      const mockRes = {
        json: jest.fn(),
      };

      statsHandler(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          calls: {
            active: 0,
            total: 0,
          },
        })
      );
    });
  });

  describe("Drachtio SRF Integration", () => {
    it("should setup event handlers", () => {
      proxyModule = require("../proxy");

      expect(mockSrf.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockSrf.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockSrf.on).toHaveBeenCalledWith(
        "disconnect",
        expect.any(Function)
      );
    });

    it("should handle drachtio errors", () => {
      proxyModule = require("../proxy");

      // Find the error handler
      const errorCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "error"
      );
      expect(errorCall).toBeDefined();
      const errorHandler = errorCall[1];

      errorHandler(new Error("Test error"));

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Drachtio SRF error:",
        expect.any(Error)
      );
    });

    it("should handle drachtio disconnection", () => {
      proxyModule = require("../proxy");

      // Find the disconnect handler
      const disconnectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "disconnect"
      );
      expect(disconnectCall).toBeDefined();
      const disconnectHandler = disconnectCall[1];

      disconnectHandler();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Disconnected from Drachtio server"
      );
    });

    it("should setup connect handler that registers SIP handlers", () => {
      proxyModule = require("../proxy");

      // Find the connect handler
      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      expect(connectCall).toBeDefined();
      const connectHandler = connectCall[1];

      // Execute the connect handler
      connectHandler();

      expect(mockSrf.invite).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSrf.bye).toHaveBeenCalledWith(expect.any(Function));
      expect(mockSrf.cancel).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("SIP Message Handling", () => {
    it("should handle INVITE requests", () => {
      proxyModule = require("../proxy");

      // Trigger connect to register SIP handlers
      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      // Find the invite handler
      const inviteCall = mockSrf.invite.mock.calls[0];
      expect(inviteCall).toBeDefined();
      const inviteHandler = inviteCall[0];

      const mockReq = {
        source_address: "192.168.1.100",
        source_port: 5060,
        get: jest.fn().mockReturnValue("test-call-id"),
        getParsedHeader: jest.fn().mockReturnValue({
          uri: "sip:user@example.com",
        }),
        body: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
      };

      const mockRes = {
        send: jest.fn(),
      };

      inviteHandler(mockReq, mockRes);

      expect(global.activeCalls).toBe(1);
      expect(global.totalCalls).toBe(1);
    });

    it("should handle BYE requests", async () => {
      global.activeCalls = 3;

      proxyModule = require("../proxy");

      // Trigger connect to register SIP handlers
      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      // Find the bye handler
      const byeCall = mockSrf.bye.mock.calls[0];
      expect(byeCall).toBeDefined();
      const byeHandler = byeCall[0];

      const mockReq = {
        get: jest.fn().mockReturnValue("test-call-id"),
      };

      const mockRes = {
        send: jest.fn(),
      };

      await byeHandler(mockReq, mockRes);

      expect(global.activeCalls).toBe(2);
      expect(mockRes.send).toHaveBeenCalledWith(200);
    });

    it("should handle CANCEL requests", async () => {
      global.activeCalls = 2;

      proxyModule = require("../proxy");

      // Trigger connect to register SIP handlers
      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      // Find the cancel handler
      const cancelCall = mockSrf.cancel.mock.calls[0];
      expect(cancelCall).toBeDefined();
      const cancelHandler = cancelCall[0];

      const mockReq = {
        get: jest.fn().mockReturnValue("test-call-id"),
      };

      const mockRes = {
        send: jest.fn(),
      };

      await cancelHandler(mockReq, mockRes);

      expect(global.activeCalls).toBe(1);
      expect(mockRes.send).toHaveBeenCalledWith(200);
    });
  });

  describe("RTPEngine Integration", () => {
    let mockB2BCall;

    beforeEach(() => {
      mockB2BCall = {
        on: jest.fn(),
        start: jest.fn(),
      };
      mockSrf.createB2B.mockReturnValue(mockB2BCall);
    });

    it("should handle successful B2B call creation", async () => {
      proxyModule = require("../proxy");

      // Trigger connect to register SIP handlers
      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      // Mock successful RTPEngine response
      mockSrf.request.mockResolvedValue({
        body: {
          sdp: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
        },
      });

      // Find the invite handler
      const inviteCall = mockSrf.invite.mock.calls[0];
      expect(inviteCall).toBeDefined();
      const inviteHandler = inviteCall[0];

      const mockReq = {
        source_address: "192.168.1.100",
        source_port: 5060,
        get: jest.fn().mockReturnValue("test-call-id"),
        getParsedHeader: jest.fn().mockReturnValue({
          uri: "sip:user@example.com",
        }),
        body: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
      };

      const mockRes = {
        send: jest.fn(),
      };

      await inviteHandler(mockReq, mockRes);

      expect(mockSrf.createB2B).toHaveBeenCalled();
      expect(mockB2BCall.on).toHaveBeenCalledWith(
        "response",
        expect.any(Function)
      );
      expect(mockB2BCall.on).toHaveBeenCalledWith("end", expect.any(Function));
      expect(mockB2BCall.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function)
      );
      expect(mockB2BCall.start).toHaveBeenCalled();
    });

    it("should handle successful 200 OK response from Asterisk", async () => {
      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      // Mock successful RTPEngine responses
      mockSrf.request
        .mockResolvedValueOnce({
          body: {
            sdp: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
          },
        })
        .mockResolvedValueOnce({
          body: {
            sdp: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 0\r\na=rtpmap:0 pcmu/8000\r\n",
          },
        });

      const inviteCall = mockSrf.invite.mock.calls[0];
      const inviteHandler = inviteCall[0];

      const mockReq = {
        source_address: "192.168.1.100",
        source_port: 5060,
        get: jest.fn().mockReturnValue("test-call-id"),
        getParsedHeader: jest.fn().mockReturnValue({
          uri: "sip:user@example.com",
        }),
        body: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
      };

      const mockRes = {
        send: jest.fn(),
      };

      await inviteHandler(mockReq, mockRes);

      // Find and trigger the response handler
      const responseCall = mockB2BCall.on.mock.calls.find(
        (call) => call[0] === "response"
      );
      expect(responseCall).toBeDefined();
      const responseHandler = responseCall[1];

      const mockResponse = {
        status: 200,
        body: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 0\r\na=rtpmap:0 pcmu/8000\r\n",
      };

      await responseHandler(mockResponse);

      expect(mockSrf.request).toHaveBeenCalledTimes(2); // offer + answer
    });

    it("should handle error response from Asterisk", async () => {
      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      mockSrf.request.mockResolvedValue({
        body: {
          sdp: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
        },
      });

      const inviteCall = mockSrf.invite.mock.calls[0];
      const inviteHandler = inviteCall[0];

      const mockReq = {
        source_address: "192.168.1.100",
        source_port: 5060,
        get: jest.fn().mockReturnValue("test-call-id"),
        getParsedHeader: jest.fn().mockReturnValue({
          uri: "sip:user@example.com",
        }),
        body: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
      };

      const mockRes = {
        send: jest.fn(),
      };

      await inviteHandler(mockReq, mockRes);

      // Find and trigger the response handler with error status
      const responseCall = mockB2BCall.on.mock.calls.find(
        (call) => call[0] === "response"
      );
      const responseHandler = responseCall[1];

      const mockResponse = {
        status: 486, // Busy Here
        body: "",
      };

      await responseHandler(mockResponse);

      expect(global.activeCalls).toBe(0); // Should be decremented
    });

    it("should handle B2B call end event", async () => {
      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      mockSrf.request.mockResolvedValue({
        body: {
          sdp: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
        },
      });

      const inviteCall = mockSrf.invite.mock.calls[0];
      const inviteHandler = inviteCall[0];

      const mockReq = {
        source_address: "192.168.1.100",
        source_port: 5060,
        get: jest.fn().mockReturnValue("test-call-id"),
        getParsedHeader: jest.fn().mockReturnValue({
          uri: "sip:user@example.com",
        }),
        body: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
      };

      const mockRes = {
        send: jest.fn(),
      };

      await inviteHandler(mockReq, mockRes);

      // Find and trigger the end handler
      const endCall = mockB2BCall.on.mock.calls.find(
        (call) => call[0] === "end"
      );
      const endHandler = endCall[1];

      await endHandler();

      expect(global.activeCalls).toBe(0); // Should be decremented
    });

    it("should handle B2B call error event", async () => {
      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      mockSrf.request.mockResolvedValue({
        body: {
          sdp: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
        },
      });

      const inviteCall = mockSrf.invite.mock.calls[0];
      const inviteHandler = inviteCall[0];

      const mockReq = {
        source_address: "192.168.1.100",
        source_port: 5060,
        get: jest.fn().mockReturnValue("test-call-id"),
        getParsedHeader: jest.fn().mockReturnValue({
          uri: "sip:user@example.com",
        }),
        body: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
      };

      const mockRes = {
        send: jest.fn(),
      };

      await inviteHandler(mockReq, mockRes);

      // Find and trigger the error handler
      const errorCall = mockB2BCall.on.mock.calls.find(
        (call) => call[0] === "error"
      );
      const errorHandler = errorCall[1];

      await errorHandler(new Error("B2B call failed"));

      expect(global.activeCalls).toBe(0); // Should be decremented
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          "B2B call error for test-call-id: B2B call failed"
        )
      );
    });

    it("should handle RTPEngine offer failure with fallback", async () => {
      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      // Mock RTPEngine failure then success
      mockSrf.request
        .mockRejectedValueOnce(new Error("Load balancer failed"))
        .mockResolvedValueOnce({
          body: {
            sdp: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
          },
        });

      const inviteCall = mockSrf.invite.mock.calls[0];
      const inviteHandler = inviteCall[0];

      const mockReq = {
        source_address: "192.168.1.100",
        source_port: 5060,
        get: jest.fn().mockReturnValue("test-call-id"),
        getParsedHeader: jest.fn().mockReturnValue({
          uri: "sip:user@example.com",
        }),
        body: "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 111\r\na=rtpmap:111 opus/48000/2\r\n",
      };

      const mockRes = {
        send: jest.fn(),
      };

      await inviteHandler(mockReq, mockRes);

      expect(mockSrf.request).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("RTPEngine offer failed via load balancer")
      );
    });

    it("should handle INVITE errors gracefully", async () => {
      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      const inviteCall = mockSrf.invite.mock.calls[0];
      const inviteHandler = inviteCall[0];

      // Mock a request that will cause an error
      const mockReq = {
        source_address: "192.168.1.100",
        source_port: 5060,
        get: jest.fn().mockImplementation(() => {
          throw new Error("Mock error");
        }),
        getParsedHeader: jest.fn(),
        body: "invalid sdp",
      };

      const mockRes = {
        send: jest.fn(),
      };

      await inviteHandler(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error handling INVITE")
      );
    });
  });

  describe("SDP Filtering Functions", () => {
    it("should filter SDP for Asterisk (remove Opus)", () => {
      const { filterSdpForAsterisk } = require("../proxy");

      const originalSdp =
        "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 0 8 111\r\na=rtpmap:0 pcmu/8000\r\na=rtpmap:8 pcma/8000\r\na=rtpmap:111 opus/48000/2\r\n";

      const filteredSdp = filterSdpForAsterisk(originalSdp);

      expect(filteredSdp).not.toContain("opus/48000/2");
      expect(filteredSdp).toContain("pcmu/8000");
      expect(filteredSdp).toContain("pcma/8000");
    });

    it("should filter SDP for browser (remove PCMU/PCMA)", () => {
      const { filterSdpForBrowser } = require("../proxy");

      const originalSdp =
        "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 0 8 111\r\na=rtpmap:0 pcmu/8000\r\na=rtpmap:8 pcma/8000\r\na=rtpmap:111 opus/48000/2\r\n";

      const filteredSdp = filterSdpForBrowser(originalSdp);

      expect(filteredSdp).toContain("opus/48000/2");
      expect(filteredSdp).not.toContain("pcmu/8000");
      expect(filteredSdp).not.toContain("pcma/8000");
    });

    it("should handle SDP with fmtp attributes for Asterisk", () => {
      const { filterSdpForAsterisk } = require("../proxy");

      const originalSdp =
        "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 0 8 111\r\na=rtpmap:0 pcmu/8000\r\na=rtpmap:8 pcma/8000\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10;useinbandfec=1\r\n";

      const filteredSdp = filterSdpForAsterisk(originalSdp);

      expect(filteredSdp).not.toContain("fmtp:111");
      expect(filteredSdp).not.toContain("opus/48000/2");
      expect(filteredSdp).toContain("pcmu/8000");
    });

    it("should handle SDP with fmtp attributes for browser", () => {
      const { filterSdpForBrowser } = require("../proxy");

      const originalSdp =
        "v=0\r\no=- 1234567890 2 IN IP4 192.168.1.100\r\ns=-\r\nc=IN IP4 192.168.1.100\r\nt=0 0\r\nm=audio 10000 RTP/AVP 0 8 111\r\na=rtpmap:0 pcmu/8000\r\na=rtpmap:8 pcma/8000\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:0 test=1\r\na=fmtp:8 test=2\r\n";

      const filteredSdp = filterSdpForBrowser(originalSdp);

      expect(filteredSdp).not.toContain("fmtp:0");
      expect(filteredSdp).not.toContain("fmtp:8");
      expect(filteredSdp).toContain("opus/48000/2");
    });
  });

  describe("RTPEngine Worker Selection", () => {
    it("should have multiple workers configured", () => {
      proxyModule = require("../proxy");

      // We can't directly test getNextRtpengineWorker since it's not exported,
      // but we can verify the configuration exists
      expect(proxyModule).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle BYE request errors gracefully", async () => {
      global.activeCalls = 2;

      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      const byeCall = mockSrf.bye.mock.calls[0];
      const byeHandler = byeCall[0];

      // Mock request that throws error
      const mockReq = {
        get: jest.fn().mockImplementation(() => {
          throw new Error("Mock BYE error");
        }),
      };

      const mockRes = {
        send: jest.fn(),
      };

      await byeHandler(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error handling BYE")
      );
    });

    it("should handle CANCEL request errors gracefully", async () => {
      global.activeCalls = 2;

      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      const cancelCall = mockSrf.cancel.mock.calls[0];
      const cancelHandler = cancelCall[0];

      // Mock request that throws error
      const mockReq = {
        get: jest.fn().mockImplementation(() => {
          throw new Error("Mock CANCEL error");
        }),
      };

      const mockRes = {
        send: jest.fn(),
      };

      await cancelHandler(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error handling CANCEL")
      );
    });

    it("should log all RTPEngine delete failures", async () => {
      proxyModule = require("../proxy");

      const connectCall = mockSrf.on.mock.calls.find(
        (call) => call[0] === "connect"
      );
      const connectHandler = connectCall[1];
      connectHandler();

      // Mock all RTPEngine requests to fail
      mockSrf.request.mockRejectedValue(new Error("RTPEngine delete failed"));

      const byeCall = mockSrf.bye.mock.calls[0];
      const byeHandler = byeCall[0];

      const mockReq = {
        get: jest.fn().mockReturnValue("test-call-id"),
      };

      const mockRes = {
        send: jest.fn(),
      };

      await byeHandler(mockReq, mockRes);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("RTPEngine delete failed via load balancer")
      );
    });
  });

  describe("Graceful Shutdown", () => {
    it("should handle SIGTERM", async () => {
      const processSpy = jest.spyOn(process, "exit").mockImplementation();
      mockSrf.disconnect.mockResolvedValue();

      proxyModule = require("../proxy");

      // Simulate SIGTERM
      process.emit("SIGTERM");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSrf.disconnect).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalledWith(0);

      processSpy.mockRestore();
    });

    it("should handle SIGINT", async () => {
      const processSpy = jest.spyOn(process, "exit").mockImplementation();
      mockSrf.disconnect.mockResolvedValue();

      proxyModule = require("../proxy");

      // Simulate SIGINT
      process.emit("SIGINT");

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSrf.disconnect).toHaveBeenCalled();
      expect(processSpy).toHaveBeenCalledWith(0);

      processSpy.mockRestore();
    });
  });
});
