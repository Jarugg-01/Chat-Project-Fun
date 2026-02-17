let peer = null;
let localStream = null;
let connections = {}; // Stores DataConnections
let myId = "";
let myName = "";
let roomName = "";

async function init() {
    myName = document.getElementById('username').value;
    roomName = document.getElementById('room-id').value;

    if (!myName || !roomName) return alert("Please enter name and room");

    // Get Audio
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
        console.error("Failed to get local stream", err);
        alert("Audio access is required for voice chat.");
        return;
    }

    // Initialize Peer - we append the room name to help with discovery
    // In a production app, you'd use a backend to list peers in a room.
    // Here, we use a predictable ID for the 'host' of the room.
    peer = new Peer(`${roomName}-${Math.floor(Math.random() * 10000)}`);

    peer.on('open', (id) => {
        myId = id;
        document.getElementById('join-section').classList.add('hidden');
        document.getElementById('chat-section').classList.remove('hidden');
        
        // Logic: Try to connect to other peers in the "room"
        // This is a simplified discovery: in a real app, you'd fetch this list from a server.
        // For this demo, we rely on PeerJS's public directory or manual logic.
        console.log("Connected with ID: " + id);
        updateUserList();
    });

    // Handle incoming text connections
    peer.on('connection', (conn) => {
        setupDataConnection(conn);
    });

    // Handle incoming voice calls
    peer.on('call', (call) => {
        call.answer(localStream);
        setupVoiceCall(call);
    });

    // Simplified Discovery: For this demo, we'll "announce" our presence
    // In a real P2P mesh, you usually need a signaling server to tell you who else is in the room.
}

function setupDataConnection(conn) {
    connections[conn.peer] = conn;
    conn.on('data', (data) => {
        if (data.type === 'chat') {
            appendMessage(data.user, data.message);
        }
        if (data.type === 'presence') {
            updateUserList(data.user);
        }
    });
    
    conn.on('open', () => {
        conn.send({ type: 'presence', user: myName });
    });
}

function setupVoiceCall(call) {
    const audio = document.createElement('audio');
    audio.setAttribute('autoplay', 'true');
    call.on('stream', (remoteStream) => {
        audio.srcObject = remoteStream;
        document.getElementById('audio-containers').append(audio);
    });
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value;
    if (!msg) return;

    appendMessage('Me', msg);
    
    // Broadcast to all connected peers
    Object.values(connections).forEach(conn => {
        conn.send({ type: 'chat', user: myName, message: msg });
    });
    
    input.value = "";
}

function appendMessage(user, msg) {
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = `<b>${user}:</b> ${msg}`;
    document.getElementById('messages').appendChild(div);
    document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
}

function updateUserList(newUser = null) {
    const list = document.getElementById('active-users');
    if (newUser && !list.innerText.includes(newUser)) {
        const item = document.createElement('div');
        item.innerText = "• " + newUser;
        list.appendChild(item);
    }
}