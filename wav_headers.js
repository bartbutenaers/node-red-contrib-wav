/**
 * Copyright 2018 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
module.exports = function(RED) {
	var wavHeaders = require('wav-headers');

	function WavHeadersNode(config) {
		RED.nodes.createNode(this, config);
    this.channels   = config.channels || 1;
		this.sampleRate = config.samplerate || 22050;
    this.bitDepth   = config.bitwidth || 16;
    
    var node = this;
    
    node.on("input", function(msg) {
      var fileBodyBuffer = msg.payload || new Buffer();
      
      // The message payload should be a buffer
      if (!Buffer.isBuffer(fileBodyBuffer)) {
        return;
      }
    
      var options = { channels  : node.channels,
                      sampleRate: node.sampleRate,
                      bitDepth  : node.bitDepth,
                      dataLength: fileBodyBuffer
      };
 
      // Create a WAV headers buffer, based on the specified options
      var headersBuffer = wavHeaders(options);
      
      // Store a 'full' buffer in the message payload.
      msg.payload = Buffer.concat([ headersBuffer, fileBodyBuffer ]);

      node.send(msg);
    });

	  node.on("close", function() {
      // Nothing to cleanup
	  }
  }
  
	RED.nodes.registerType("wav-headers", WavHeadersNode);
}
