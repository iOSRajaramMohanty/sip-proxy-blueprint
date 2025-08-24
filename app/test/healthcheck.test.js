const http = require("http");

// Mock the http module
jest.mock("http");

describe("Healthcheck Script", () => {
  let mockRequest;
  let mockResponse;
  let mockHttpRequest;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock response object
    mockResponse = {
      statusCode: 200,
    };

    // Mock request object
    mockRequest = {
      on: jest.fn(),
      destroy: jest.fn(),
      end: jest.fn(),
    };

    // Mock http.request
    mockHttpRequest = jest.fn().mockReturnValue(mockRequest);
    http.request = mockHttpRequest;
  });

  it("should exit with code 0 for successful health check", () => {
    const processSpy = jest.spyOn(process, "exit").mockImplementation();

    // Simulate successful response
    mockHttpRequest.mockImplementation((options, callback) => {
      callback(mockResponse);
      return mockRequest;
    });

    // Import the healthcheck script
    require("../healthcheck");

    expect(processSpy).toHaveBeenCalledWith(0);
    processSpy.mockRestore();
  });

  it("should exit with code 1 for failed health check", () => {
    const processSpy = jest.spyOn(process, "exit").mockImplementation();

    // Simulate failed response
    mockHttpRequest.mockImplementation((options, callback) => {
      mockResponse.statusCode = 500;
      callback(mockResponse);
      return mockRequest;
    });

    // Import the healthcheck script
    require("../healthcheck");

    expect(processSpy).toHaveBeenCalledWith(1);
    processSpy.mockRestore();
  });

  it("should exit with code 1 on request error", () => {
    const processSpy = jest.spyOn(process, "exit").mockImplementation();

    mockHttpRequest.mockImplementation((options, callback) => {
      // Simulate error event
      const errorCallback = mockRequest.on.mock.calls.find(
        (call) => call[0] === "error"
      )[1];
      errorCallback(new Error("Network error"));

      return mockRequest;
    });

    // Import the healthcheck script
    require("../healthcheck");

    expect(processSpy).toHaveBeenCalledWith(1);
    processSpy.mockRestore();
  });

  it("should configure request with correct options", () => {
    // Set environment variable
    process.env.PORT = "8080";

    mockHttpRequest.mockImplementation((options, callback) => {
      expect(options.hostname).toBe("127.0.0.1");
      expect(options.port).toBe(8080);
      expect(options.path).toBe("/health");
      expect(options.method).toBe("GET");
      expect(options.timeout).toBe(2000);

      callback(mockResponse);
      return mockRequest;
    });

    const processSpy = jest.spyOn(process, "exit").mockImplementation();

    // Import the healthcheck script
    require("../healthcheck");

    expect(processSpy).toHaveBeenCalledWith(0);
    processSpy.mockRestore();

    // Reset environment variable
    delete process.env.PORT;
  });
});
