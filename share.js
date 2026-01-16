const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// --- AUTO-INSTALLER ---
// This function automatically installs missing packages so the script just works.
function getModule(name) {
    try {
        return require(name);
    } catch (e) {
        console.log(`\n[System] Installing missing tool: ${name}...`);
        try {
            // Installs the package automatically
            execSync(`npm install ${name}`, { stdio: 'inherit', shell: true });
            console.log(`[System] ${name} installed successfully.\n`);
            return require(name);
        } catch (err) {
            console.error(`\n[Error] Could not install ${name}.`);
            console.error(`Please try running: npm install ${name}`);
            return null;
        }
    }
}

const qrcode = getModule('qrcode-terminal');
const localtunnel = getModule('localtunnel');
// ----------------------

const PORT = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

server.listen(PORT, async () => {
    const localIP = getLocalIP();
    const localUrl = `http://${localIP}:${PORT}`;
    
    console.log(`\nServer running locally at ${localUrl}`);
    
    if (qrcode) {
        console.log('---------------------------------------------------');
        console.log('LOCAL NETWORK (WiFi) QR CODE:');
        qrcode.generate(localUrl, { small: true });
        console.log('---------------------------------------------------');
    }

    console.log('Attempting to start public tunnel...');

    // Fetch public IP for LocalTunnel password if needed
    http.get({'host': 'api.ipify.org', 'port': 80, 'path': '/'}, function(resp) {
        resp.on('data', function(ip) {
            console.log(`\n(NOTE: If the public link asks for a Tunnel Password, enter: ${ip})`);
        });
    });

    if (localtunnel) {
        try {
            const tunnel = await localtunnel({ port: PORT });
            console.log('\n---------------------------------------------------');
            console.log('PUBLIC INTERNET QR CODE:');
            console.log(`URL: ${tunnel.url}`);
            if (qrcode) qrcode.generate(tunnel.url, { small: true });
            console.log('---------------------------------------------------');
            
            tunnel.on('close', () => {
                console.log('Tunnel closed');
            });
        } catch (err) {
            console.error('Error starting tunnel:', err);
        }
    } else {
        console.log("Could not start public tunnel because 'localtunnel' module is missing.");
    }
});