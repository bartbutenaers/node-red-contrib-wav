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
        this.channels   = config.channels   || 1;
		this.sampleRate = config.samplerate || 22050;
        this.bitDepth   = config.bitwidth   || 16;
        this.action     = config.action     || "add";
    
        var node = this;
        
        // Reads slice from a buffer as string
        function readText(headerBuffer) {
            var str = '';
            for(var i = 0; i < headerBuffer.length; i++) {
                str += String.fromCharCode(headerBuffer[i]);
            }
            return str;
        }

        // Read slice from buffer as Decimal
        function readDecimal(headerBuffer) {
            var sum = 0;
            for(var i = 0; i < headerBuffer.length; i++)
                sum |= headerBuffer[i] << (i*8);
            return sum;
        }
        
        // Parse the WAV headers from a buffer
        function parseWavHeaders(headerBuffer) { 
            var headers = {};
            
            headers.chunkID       = readText(headerBuffer.slice(0, 4));
            headers.chunkSize     = readDecimal(headerBuffer.slice(4, 8));
            headers.format        = readText(headerBuffer.slice(8, 12));
            headers.compression   = readDecimal(headerBuffer.slice(20, 22));
            headers.numChannels   = readDecimal(headerBuffer.slice(22, 24)); 
            headers.sampleRate    = readDecimal(headerBuffer.slice(24, 28)); 
            headers.byteRate      = readDecimal(headerBuffer.slice(28, 32)); 
            headers.blockAlign    = readDecimal(headerBuffer.slice(32, 34)); 
            headers.bitsPerSample = readDecimal(headerBuffer.slice(34, 36));
            
            return headers;
        }
    
        node.on("input", function(msg) {
            var msg2 = {};
            
            // The message payload should be a buffer (containing an audio chunk of PCM audio samples)
            if (!Buffer.isBuffer(msg.payload)) {
                console.log("WAV audio should be delivered as a buffer in the msg.payload");
                return;
            }
    
            switch (node.action) {
                case "add":
                    var options = { channels  : node.channels,
                                    sampleRate: node.sampleRate,
                                    bitDepth  : node.bitDepth,
                                    dataLength: msg.payload.length
                    };
         
                    // Create a WAV headers buffer, based on the specified options
                    var headersBuffer = wavHeaders(options);
              
                    // Store a 'full' buffer in the message payload.
                    msg.payload = Buffer.concat([ headersBuffer, msg.payload ]);
                    
                    // Show the added headers on the second output
                    msg2.payload = options;
                    
                    break;
                    
                case "del":
                    // Wav headers are normally 44 bytes long, but wav headers can some optional header information.
                    // Therefore we cannot simple remove the first 44 bytes.  Instead it is better to search for the Subchunk2ID:
                    //    <wav headers>
                    //    Subchunk2ID : this is the constant text 'data'
                    //    Subchunk2Size : total number of bytes that the audio samples consist of (Subchunk2Size number is 4 bytes long)
                    //    <audio samples>
                    // So we will scan the buffer for the 'data' and then start reading audio samples 4 bytes after that...
                    var index = msg.payload.indexOf("data");
                    
                    if (index === -1) {
                        console.log("Cannot determine end of WAV headers, due to missing Subchunk2ID");
                        return;
                    }
                    
                    // Get a copy of the WAV headers for the second output
                    var headerBuffer = Buffer.from(msg.payload.slice(0, index));
                    
                    // Skip the Subchunk2ID (4 bytes long) and also the Subchunk2Size (4 bytes long)
                    index += 8;
                    
                    if (index > msg.payload.length) {
                        console.log("End of WAV headers found, but no audio samples available in msg.payload");
                        return;                   
                    }
                    
                    // Remove the WAV headers, and send a payload containing only the real audio samples
                    msg.payload = msg.payload.slice(index);
                    
                    // Show the (human readable) WAV headers on the second output
                    msg2.payload = parseWavHeaders(headerBuffer);
                    
                    break;
                    
                case "get":
                    // See explanation above ...
                    var index = msg.payload.indexOf("data");
                    
                    if (index === -1) {
                        console.log("Cannot determine end of WAV headers, due to missing Subchunk2ID");
                        return;
                    }
                    
                    // Get a copy of the WAV headers for the second output
                    var headerBuffer = Buffer.from(msg.payload.slice(0, index));
                    
                    // Show the (human readable) WAV headers on the second output
                    msg2.payload = parseWavHeaders(headerBuffer);
                    
                    // Calculate the wav duration
                    msg2.payload.duration = msg2.payload.chunkSize / (msg2.payload.sampleRate * msg2.payload.numChannels * (msg2.payload.bitsPerSample / 8));
                    
                    // Round the duration to two decimals
                    msg2.payload.duration = Math.round(msg2.payload.duration * 100) / 100
                    
                    break;
            }

            node.send([msg, msg2]);
        });
    }
  
	RED.nodes.registerType("wav-headers", WavHeadersNode);
}
