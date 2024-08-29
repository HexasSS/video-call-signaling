document.addEventListener('DOMContentLoaded', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('getUserMedia tidak didukung di browser ini. Silakan gunakan browser yang mendukung WebRTC seperti Chrome, Firefox, Edge, atau Safari.');
        return;
    }

    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const startCallButton = document.getElementById('startCall');
    const endCallButton = document.getElementById('endCall');
    const targetIdInput = document.getElementById('targetIdInput');
    const myIdDisplay = document.getElementById('myIdDisplay');
    const incomingCallDiv = document.getElementById('incomingCall');
    const callerIdSpan = document.getElementById('callerId');
    const acceptCallButton = document.getElementById('acceptCall');
    const rejectCallButton = document.getElementById('rejectCall');
    
    let localStream;
    let peerConnection;
    let socket;
    let myId;
    let targetId;
    let callerId;
    
    const servers = {
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302'
            }
        ]
    };

    const initializeLocalStream = async () => {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            localVideo.srcObject = localStream;
            console.log('Stream lokal diperoleh');
        } catch (error) {
            console.error('Kesalahan mengakses media lokal:', error);
            alert('Kesalahan mengakses media lokal: ' + error.message);
        }
    };

    const initializePeerConnection = () => {
        if (!localStream) {
            console.error('localStream belum diinisialisasi');
            return;
        }

        peerConnection = new RTCPeerConnection(servers);

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.send(JSON.stringify({ ice: event.candidate, targetId }));
                console.log('ICE candidate dikirim:', event.candidate);
            }
        };

        peerConnection.ontrack = event => {
            if (event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                console.log('Stream remote disetel:', event.streams[0]);
            }
        };

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        console.log('Track stream lokal ditambahkan ke peer connection');
    };

    const connectSocket = () => {
        const ngrokUrl = 'https://26c0-104-28-204-164.ngrok-free.app '; // Ganti dengan subdomain ngrok yang dihasilkan

        socket = new WebSocket(`wss://${ngrokUrl}`);
        console.log(`WebSocket menghubungkan ke wss://${ngrokUrl}`);

        socket.onopen = () => {
            console.log('Terhubung ke server signaling');
        };

        socket.onmessage = async (message) => {
            const data = JSON.parse(message.data);
            console.log('Pesan dari server:', data);

            if (data.id) {
                myId = data.id;
                myIdDisplay.textContent = myId;
                console.log('ID saya disetel:', myId);
            }

            if (data.type === 'offer') {
                callerId = data.fromId;
                callerIdSpan.textContent = callerId;
                incomingCallDiv.style.display = 'block';
                console.log('Panggilan masuk dari:', callerId);
            }

            if (data.fromId && !targetId) {
                targetId = data.fromId;
                console.log('ID target disetel:', targetId);
            }

            if (data.sdp) {
                console.log('SDP diterima:', data.sdp);
                if (data.sdp.type === 'offer') {
                    if (!peerConnection) {
                        initializePeerConnection();
                    }
                    try {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                        console.log('Remote SDP disetel:', data.sdp);

                        if (peerConnection.signalingState === "have-remote-offer") {
                            const answer = await peerConnection.createAnswer();
                            await peerConnection.setLocalDescription(answer);
                            socket.send(JSON.stringify({ sdp: answer, targetId: data.fromId }));
                            console.log('Jawaban dikirim:', answer);
                        } else {
                            console.error('Signaling state tidak valid untuk createAnswer:', peerConnection.signalingState);
                        }
                    } catch (error) {
                        console.error('Kesalahan memproses SDP:', error);
                    }
                } else if (data.sdp.type === 'answer' && peerConnection) {
                    if (peerConnection.signalingState === "have-local-offer") {
                        try {
                            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                            console.log('Remote SDP disetel:', data.sdp);
                        } catch (error) {
                            console.error('Kesalahan menyetel remote description:', error);
                        }
                    } else {
                        console.error('Signaling state tidak valid untuk setRemoteDescription dengan answer:', peerConnection.signalingState);
                    }
                }
            } else if (data.ice) {
                console.log('ICE candidate diterima:', data.ice);
                if (peerConnection && peerConnection.remoteDescription) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.ice));
                        console.log('ICE candidate ditambahkan:', data.ice);
                    } catch (error) {
                        console.error('Kesalahan menambahkan ICE candidate:', error);
                    }
                } else {
                    console.log('Remote description belum disetel. ICE candidate dibuang:', data.ice);
                }
            }
        };

        socket.onerror = (error) => {
            console.error('Kesalahan WebSocket:', error);
        };

        socket.onclose = () => {
            console.log('Koneksi WebSocket ditutup');
        };
    };

    connectSocket();

    await initializeLocalStream();
    initializePeerConnection();

    startCallButton.addEventListener('click', async () => {
        try {
            targetId = targetIdInput.value.trim();
            if (!targetId) {
                alert('Silakan masukkan ID target.');
                return;
            }

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.send(JSON.stringify({ type: 'offer', sdp: offer, targetId }));
            console.log('Tawaran dikirim:', offer);
        } catch (error) {
            console.error('Kesalahan memulai panggilan:', error);
            alert('Kesalahan memulai panggilan: ' + error.message);
        }
    });

    acceptCallButton.addEventListener('click', async () => {
        incomingCallDiv.style.display = 'none';
        try {
            if (!peerConnection) {
                initializePeerConnection();
            }

            if (peerConnection.signalingState === "have-remote-offer") {
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.send(JSON.stringify({ sdp: answer, targetId: callerId }));
                console.log('Jawaban dikirim:', answer);
            } else {
                console.error('Signaling state tidak valid untuk createAnswer:', peerConnection.signalingState);
            }
        } catch (error) {
            console.error('Kesalahan menerima panggilan:', error);
            alert('Kesalahan menerima panggilan: ' + error.message);
        }
    });

    rejectCallButton.addEventListener('click', () => {
        incomingCallDiv.style.display = 'none';
        socket.send(JSON.stringify({ type: 'reject', targetId: callerId }));
        console.log('Panggilan ditolak');
    });

    endCallButton.addEventListener('click', () => {
        if (peerConnection) {
            peerConnection.close();
            localVideo.srcObject = null;
            remoteVideo.srcObject = null;
            console.log('Panggilan diakhiri');
        }
        if (socket) {
            socket.close();
        }
    });
    
});
