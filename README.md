# node-red-contrib-wav-headers
A Node Red node to add WAV headers to PCM audio chunks

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-wav-headers
```

## Usage
Some Node-RED blocks can inject chunks of audio samples into the Node-RED flow.  In some cases (e.g. node-red-contrib-micropi) this will be raw audio (PCM), which is a Buffer of bytes representing the amplitudes of the audio samples. However such a ***raw audio chunk doesn't contain any information about the content of the bytes***!

This node can be used to add this kind of information to the raw audio samples, by adding **WAV headers** to the audio chunk:
+ The number of **channels**: is it a single channel recording or multiple channels (left microphone and right microphone).
+ The sample **rate**: i.e. the number of audio samples per second.
+ The bit width: i.e. the number of bits of each audio sample.  Are we dealing with 8-bit samples (1 byte), or 16-bit samples (2 bytes) ...

The `msg.payload` of the input message contains audio data, and the `msg.payload` of the output message contains a WAV container (i.e. both headers and audio data):

![Example flow](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-wav-headers/master/images/wav_headers_flow.png)
```
[{"id":"ab6fb878.b001b8","type":"microphone","z":"279b8956.27dfe6","name":"microphone","endian":"little","bitwidth":"16","encoding":"signed-integer","channels":"1","rate":"22050","silence":"60","debug":false,"active":true,"x":950,"y":1000,"wires":[["c27f2983.6bf2b8"]]},{"id":"c27f2983.6bf2b8","type":"wav-headers","z":"279b8956.27dfe6","name":"","channels":1,"samplerate":22050,"bitwidth":16,"x":1136,"y":1000,"wires":[["ee8cf749.22e888"]]},{"id":"ee8cf749.22e888","type":"ui_audio","z":"279b8956.27dfe6","name":"","group":"180d570c.93b059","voice":"0","always":false,"x":1320,"y":1000,"wires":[]},{"id":"180d570c.93b059","type":"ui_group","z":"","name":"Devices","tab":"493cf398.76af9c","order":2,"disp":false,"width":"6"},{"id":"493cf398.76af9c","type":"ui_tab","z":"","name":"Ratby Road","icon":"dashboard"}]
```
If we wouldn't add the WAV headers in this example flow, the receiver wouldn't know what kind of information is contained in the audio bytes arriving.  In this example the audio-out node (of the Node-RED dashboard) would not be able to play the PCM audio samples, since the browser would raise an audio decoding exception ...

## More detailed
This section is only required if you want to learn more details of what this node is doing behind the scenes.  That might be interesting if you are running in troubles, and you have to do some troubleshooting ...

### Introduction to PCM

This is how digital audio works in a nutshell:

![Audio basics](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-wav-headers/master/images/wav_headers_basics.png)

1. When you speak, sound waves travel through air.
2. The microphone's membrane starts vibrating (from it's center position at rest backwards and forwards). 
    + The number of times per second it vibrates is called the *frequency* (note, tone, pitch), and is expressed in Hertz (Hz).  Humans can hear sounds between 20 Hz and 20 kHz.
    + The distance it travels from it's resting point is the *gain* (volume, loudness), and is expressed in decibels (dB).
3. This vibration results in an electrical wave.  When the membrane goes forwards (from it's center position), the electrical wave is going up too.  When the membrane goes backwards, the electrical wave is going down too.
4. The height (*amplitude*) of the wave is measured at regular time intervals, which is called *sampling*.  The *sample rate* is the number of samples per second, e.g. for CDs a sample rate of 44100 Hz  is used.  How higher the sample rate, how better our sound quality will become (but the more cpu and memory will be needed).  In case of e.g. 2 channels (left and right), a sample contains the bytes of both channels:

    ![Audio channels](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-wav-headers/master/images/wav_headers_channels.png)
  
5. During *quantization* each of those analog voltage values is converted to the nearest ***byte value***.   The more bits (8, 16, 24 , 32) are used, the better our digital audio signal will approximate the original analog signal (but the more cpu and memory will be needed).  
6. The result will be an endless byte stream, containing digital sample values.  This audio format is called **PCM** (Pulse Code Modulation), which is most of the time uncompressed.
7. Those PCM samples are grouped together in **chunks** of N bytes, to avoid having to process the samples one by one (and using too much system resources).

Such a *PCM (i.e. raw audio) signal is required, whenever you need to manipulate the audio signal (e.g. amplify it, filter out noise, ...)*.  However PCM uses a lot of cpu and storage, e.g. a 16 bit signal at 44100 Hz produces every second 88,2 Kbyte which you need to process.  Therefore the pcm signal will be **compressed** (e.g. mp3 format) as soon as the data doesn't need to be manipulated anymore (e.g. when stored on disc, or send over the network ...).  But inside our flow (where we want to manipulate the audio) we need to pass uncompressed PCM chunks, otherwise each node (e.g. amplifier, noise filter ...) would have to do a lot of unnecessary processing:
+ Decompress the samples (e.g. MP3) to PCM
+ Process the uncompressed PCM audio samples
+ Compress the PCM samples again (e.g. to MP3)

### Introduction to WAV
WAV (Waveform Audio File Format) is a file format for storing audio.  A WAV chunk contains both a header and audio sample data.  The data can be any kind of audio (PCM, MP3 ...), but most of the time it will contain raw audio (PCM) samples.  The headers contain information about the data bytes, to make sure the audio can be interpreted correctly afterwards.

This node receives a the data as a Buffer of bytes, containing PCM audio samples.  Then a new Buffer will be created containing all the WAV headers, and both buffers will be merged resulting in one large Buffer:

![WAV headers](https://raw.githubusercontent.com/bartbutenaers/node-red-contrib-wav-headers/master/images/wav_headers_table.png)
