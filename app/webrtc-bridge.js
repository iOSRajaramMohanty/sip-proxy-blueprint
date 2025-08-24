const WebSocket = require("ws");
const http = require("http");
const url = require("url");

class WebRTCBridge {
  constructor(port = 8080) {
    this.port = port;
    this.wss = null;
    this.clients = new Map();
    this.sipProxyUrl = process.env.SIP_PROXY_URL || "http://127.0.0.1:3000";

    console.log(`🌐 WebRTC Bridge starting on port ${this.port}`);
    console.log(`🔗 SIP Proxy URL: ${this.sipProxyUrl}`);
  }

  start() {
    // Create WebSocket server
    this.wss = new WebSocket.Server({ port: this.port });

    this.wss.on("connection", (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws: ws,
        ip: req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        connectedAt: new Date(),
        callState: "idle",
      };

      this.clients.set(clientId, clientInfo);
      console.log(
        `🔌 WebRTC client connected: ${clientId} from ${clientInfo.ip}`
      );

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "welcome",
          clientId: clientId,
          message: "WebRTC Bridge connected successfully",
        })
      );

      // Handle WebRTC messages
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebRTCMessage(clientId, data);
        } catch (error) {
          console.error(`❌ Error parsing WebRTC message: ${error.message}`);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
            })
          );
        }
      });

      // Handle client disconnect
      ws.on("close", () => {
        console.log(`🔌 WebRTC client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error(`❌ WebRTC client error: ${error.message}`);
        this.clients.delete(clientId);
      });
    });

    console.log(`✅ WebRTC Bridge started on port ${this.port}`);
  }

  handleWebRTCMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`📨 WebRTC message from ${clientId}: ${data.type}`);

    switch (data.type) {
      case "offer":
        this.handleOffer(clientId, data);
        break;
      case "answer":
        this.handleAnswer(clientId, data);
        break;
      case "ice-candidate":
        this.handleICECandidate(clientId, data);
        break;
      case "call-start":
        this.handleCallStart(clientId, data);
        break;
      case "call-end":
        this.handleCallEnd(clientId, data);
        break;
      default:
        console.log(`⚠️ Unknown WebRTC message type: ${data.type}`);
    }
  }

  async handleOffer(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`📤 Handling WebRTC offer from ${clientId}`);
    console.log(`📋 SDP (${data.sdp ? data.sdp.length : 0} bytes)`);

    try {
      // Extract SDP from WebRTC offer
      const sdp = data.sdp;

      // Analyze SDP for codec information
      const codecInfo = this.analyzeSDP(sdp);
      console.log(`🎵 SDP Analysis: ${JSON.stringify(codecInfo)}`);

      // Forward to SIP proxy
      const sipResponse = await this.forwardToSIPProxy(clientId, sdp);

      if (sipResponse.success) {
        console.log(`✅ SIP proxy response: ${sipResponse.message}`);

        // Send success response back to WebRTC client
        client.ws.send(
          JSON.stringify({
            type: "offer-accepted",
            message: "SDP forwarded to SIP proxy successfully",
            sipResponse: sipResponse,
          })
        );

        client.callState = "offer-sent";
      } else {
        console.error(`❌ SIP proxy error: ${sipResponse.error}`);

        client.ws.send(
          JSON.stringify({
            type: "offer-rejected",
            message: "Failed to forward SDP to SIP proxy",
            error: sipResponse.error,
          })
        );
      }
    } catch (error) {
      console.error(`❌ Error handling offer: ${error.message}`);

      client.ws.send(
        JSON.stringify({
          type: "error",
          message: "Failed to process WebRTC offer",
          error: error.message,
        })
      );
    }
  }

  async handleAnswer(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`📥 Handling WebRTC answer from ${clientId}`);

    // Process the answer and update call state
    client.callState = "answered";

    client.ws.send(
      JSON.stringify({
        type: "answer-received",
        message: "WebRTC answer processed successfully",
      })
    );
  }

  handleICECandidate(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`🧊 ICE candidate from ${clientId}: ${data.candidate}`);

    // In a real implementation, you would forward ICE candidates
    // between the WebRTC client and the SIP proxy
    client.ws.send(
      JSON.stringify({
        type: "ice-candidate-received",
        message: "ICE candidate processed",
      })
    );
  }

  handleCallStart(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`📞 Call started by ${clientId}`);
    client.callState = "active";

    client.ws.send(
      JSON.stringify({
        type: "call-started",
        message: "Call is now active",
      })
    );
  }

  handleCallEnd(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`📞 Call ended by ${clientId}`);
    client.callState = "idle";

    client.ws.send(
      JSON.stringify({
        type: "call-ended",
        message: "Call ended successfully",
      })
    );
  }

  analyzeSDP(sdp) {
    const analysis = {
      hasAudio: false,
      hasVideo: false,
      audioCodecs: [],
      videoCodecs: [],
      iceSupport: false,
      dtlsSupport: false,
    };

    if (!sdp) return analysis;

    const lines = sdp.split("\r\n");

    for (const line of lines) {
      if (line.startsWith("m=audio")) {
        analysis.hasAudio = true;
        // Extract audio codecs
        const codecMatch = line.match(/m=audio \d+ RTP\/AVP ([0-9\s]+)/);
        if (codecMatch) {
          analysis.audioCodecs = codecMatch[1].trim().split(/\s+/);
        }
      }

      if (line.startsWith("m=video")) {
        analysis.hasVideo = true;
        // Extract video codecs
        const codecMatch = line.match(/m=video \d+ RTP\/AVP ([0-9\s]+)/);
        if (codecMatch) {
          analysis.videoCodecs = codecMatch[1].trim().split(/\s+/);
        }
      }

      if (line.startsWith("a=ice-ufrag") || line.startsWith("a=ice-pwd")) {
        analysis.iceSupport = true;
      }

      if (line.startsWith("a=setup:") || line.includes("DTLS")) {
        analysis.dtlsSupport = true;
      }
    }

    return analysis;
  }

  async forwardToSIPProxy(clientId, sdp) {
    try {
      console.log(`🔄 Forwarding SDP to SIP proxy...`);

      // Create SIP INVITE request
      const sipRequest = {
        method: "INVITE",
        target: "test@asterisk-service.ada-asia.my:5060",
        sdp: sdp,
        headers: {
          "X-WebRTC-Client": clientId,
          "X-Proxy-By": "webrtc-bridge",
        },
      };

      // Send to SIP proxy via HTTP
      const response = await this.sendHTTPRequest("/invite", sipRequest);

      if (response.status === 200) {
        return {
          success: true,
          message: "SIP INVITE sent successfully",
          response: response.data,
        };
      } else {
        return {
          success: false,
          error: `SIP proxy returned ${response.status}: ${response.data}`,
        };
      }
    } catch (error) {
      console.error(`❌ Error forwarding to SIP proxy: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendHTTPRequest(path, data) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(data);

      const options = {
        hostname: new URL(this.sipProxyUrl).hostname,
        port: new URL(this.sipProxyUrl).port || 80,
        path: path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk;
        });

        res.on("end", () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve({
              status: res.statusCode,
              data: parsedData,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: responseData,
            });
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  generateClientId() {
    return `webrtc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getClientInfo(clientId) {
    return this.clients.get(clientId);
  }

  getAllClients() {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      ip: client.ip,
      userAgent: client.userAgent,
      connectedAt: client.connectedAt,
      callState: client.callState,
    }));
  }

  broadcast(message, filter = null) {
    const clients = filter
      ? Array.from(this.clients.values()).filter(filter)
      : Array.from(this.clients.values());

    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      console.log("🛑 WebRTC Bridge stopped");
    }
  }
}

// Export for use in other modules
module.exports = WebRTCBridge;

// Start the bridge if this file is run directly
if (require.main === module) {
  const bridge = new WebRTCBridge();

  bridge.start();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 Shutting down WebRTC Bridge...");
    bridge.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Shutting down WebRTC Bridge...");
    bridge.stop();
    process.exit(0);
  });
}
