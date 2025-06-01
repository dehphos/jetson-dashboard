import { gateway4async } from "default-gateway";
import Evilscan from "evilscan";
import { ipcMain } from "electron";
import fetch from "node-fetch";
import pako from "pako"; // Import pako for decompression
import Buffer from "buffer"; // To work with binary data

var gateway = {};

async function getGateway(){
    try{
    gateway = await gateway4async();
    }catch(error){
        if (error.message == "Unable to determine default gateway"){
            //windows local share
            gateway.gateway = "192.168.137.1"
            console.log(`gateway now found defaulting to windows share ${gateway.gateway}`)
        }
        console.log(`gatewayyy error name ${error}`)

    }

}
await getGateway();
// console.log(gateway.gateway)
// while(gateway == null){
//     await getGateway();
//     console.log(gateway)
// }

var options = {
    target: `${gateway.gateway}/24`,
    port: "3169",
    status: "O",
    banner: true
};


var jetsonIP

// Function to scan the network and find Jetson IP
async function scanNetwork() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject('Network scan timed out');
        }, 10000); // Timeout after 10 seconds
        console.log(`Scanning network: ${options.target}`); // Debug log
        const evilscan = new Evilscan(options);


        evilscan.on("result", (data) => {
            if (data.ip) {
                console.log(`Found Jetson at: ${data.ip}`); // Debug log
                jetsonIP = data.ip;
                clearTimeout(timeout); // Clear the timeout if we find an IP
                resolve(jetsonIP);
            }
        });

        evilscan.on("done", () => {
            if (!jetsonIP) {
                console.log('No Jetson device found, exiting');
                clearTimeout(timeout); // Clear the timeout if done is triggered
                resolve(null); // Resolve with null if no Jetson device is found
            }
        });
        evilscan.run();
    });
}



function uint8ArrayToBase64(uint8Array) {
    // Create a binary string from the Uint8Array
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
    }
    
    // Use btoa to convert the binary string to base64
    return btoa(binaryString);}

// Function to fetch data from Jetson and send it to the renderer
async function fetchData(url, event, ip) {
    try {
        // console.log(`url: ${url}`); // Debug log
        const response = await fetch(url);
        // console.log(`response: ${response.ok}`); // Debug log
        // console.log(response); // Debug log
        if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

        const data = await response.json();
        // console.log(data); // Debug log
        
        // Check if 'frame' exists and decompress it
        if (data.frame) {
            try {
                // Decode the base64 string and decompress it
                const compressedData = Buffer.Buffer.from(data.frame, 'base64'); // Decode base64
                const decompressedData = pako.inflate(compressedData); // Decompress using pako


                const decompressedBase64 = uint8ArrayToBase64(decompressedData);
                // console.log('Decompressed Base64:', decompressedBase64);


                // const buffer = Buffer.from(decompressedData)
                // const decompressedBase64 = buffer.toString('base64');
                // console.log(decompressedBase64); // Log the base64 string
                

                // Add the decompressed image data to the data object
                data.frame = `data:image/jpeg;base64,${decompressedBase64}`;

            } catch (error) {
                console.error("Error decompressing image:", error);
            }
        }

        // Send the updated data to renderer

        data.curtime = new Date().toLocaleTimeString();
        data.ip = ip;


        // console.log(data); // Debug log
        event.sender.send("jetson-data", data); // Send data to renderer process
    } catch (error) {
        console.error("Data fetch error:", error);
    }
}

// Handle IPC request from the renderer to start scanning
ipcMain.handle("start-scanning", async (event) => {
    try {
        var jetsonIP = await scanNetwork();
        if (!jetsonIP && options.target == `192.168.137.1/24`) {
            console.log("No Jetson device found!");
        }else if(!jetsonIP){
            console.log("cihaz bulunamadi windows share deneme yapiliyor")
            gateway.gateway = "192.168.137.1"
            options = {
                target: `${gateway.gateway}/24`,
                port: "3169",
                status: "O",
                banner: true
            };
            jetsonIP = await scanNetwork();
            if(jetsonIP){
                const targetUrl = `http://${jetsonIP}:3169/data.json`;
                console.log(`Fetching data from: ${targetUrl}`);
                setInterval(() => fetchData(targetUrl, event, jetsonIP), 15)
            }else{
                console.log("cihaz bulunamadi")
            }
        }else{
            const targetUrl = `http://${jetsonIP}:3169/data.json`;
            console.log(`Fetching data from: ${targetUrl}`);

            // Fetch data every second
            setInterval(() => fetchData(targetUrl, event, jetsonIP), 50);
        }
        
    } catch (error) {
        console.error(error);
    }
});
