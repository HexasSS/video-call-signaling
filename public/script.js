document.addEventListener('DOMContentLoaded', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('getUserMedia tidak didukung di browser ini. Silakan gunakan browser yang mendukung WebRTC seperti Chrome, Firefox, Edge, atau Safari.');
        return;
    }

    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const startCallButton = document.getElementById('startCall');
    const endCallButton = document.getElementById('endCall');
    const acceptCallButton = document.getElementById('acceptCall');
    const rejectCallButton = document.getElementById('rejectCall');
    const targetIdInput = document.getElementById('targetIdInput');
    const myIdDisplay = document.getElementById('myIdDisplay');
    const callerIdSpan = document.getElementById('callerId');
    
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

    const triggerSignAnimation = (text) => {
        console.log('Triggering sign language animation for text:', text);
        triggerSignVideos(text);
    };
    
     // Fungsi untuk memutar video/gambar bahasa isyarat satu per satu
     const triggerSignVideos = (text) => {
        const words = text.toLowerCase().split(' ');
        let delay = 0;

        // Memutar video atau menampilkan gambar untuk setiap kata, dengan jeda di antaranya
        words.forEach((word) => {
            setTimeout(() => {
                showSignMedia(word);
            }, delay);
            delay += 5000;  // Setiap media (video/gambar) ditampilkan selama 5 detik
        });
    };

    // Fungsi untuk menampilkan video atau gambar bahasa isyarat berdasarkan kata atau abjad
    const showSignMedia = (word) => {
        signVideo.style.display = 'none';  // Sembunyikan video sebelumnya
        signImage.style.display = 'none';  // Sembunyikan gambar sebelumnya

        const signMedia = signMapping[word];  // Cari kata di JSON mapping

        if (signMedia) {
            if (signMedia.type === 'video') {
                signVideo.src = `videos/${signMedia.file}`;
                signVideo.style.display = 'block';
                signVideo.play();  // Mulai memutar video
                console.log(`Displaying sign video for word: ${word}`);
            } else if (signMedia.type === 'image') {
                signImage.src = `images/${signMedia.file}`;
                signImage.style.display = 'block';  // Tampilkan gambar
                console.log(`Displaying sign image for word: ${word}`);
            }
        } else {
            console.log(`Word "${word}" not found in mapping, splitting into letters.`);
            showSignByLetters(word);
        }
    };

    // Fungsi untuk menampilkan gambar abjad jika kata tidak ditemukan di mapping
    const showSignByLetters = (word) => {
        let delay = 0;
        const letters = word.split('');

        letters.forEach((letter) => {
            const lowerCaseLetter = letter.toLowerCase();
            setTimeout(() => {
                const signMedia = signMapping[lowerCaseLetter];  // Cek gambar untuk huruf ini

                if (signMedia && signMedia.type === 'image') {
                    signImage.src = `images/${signMedia.file}`;
                    signImage.style.display = 'block';
                    console.log(`Displaying sign image for letter: ${letter}`);
                } else {
                    console.log(`No sign media found for letter: ${letter}`);
                }
            }, delay);
            delay += 2000;  // Jeda 2 detik untuk setiap huruf
        });
    };


    const initializeLocalStream = async () => {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;
            console.log('Stream lokal diperoleh');
        } catch (error) {
            console.error('Kesalahan mengakses media lokal:', error);
            alert('Kesalahan mengakses media lokal: ' + error.message);
        }
    };

    const initializePeerConnection = () => {
        peerConnection = new RTCPeerConnection(servers);

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                if (!targetId) {
                    console.error('Target ID tidak ditemukan sebelum mengirim ICE candidate');
                    return;
                }
                console.log('ICE candidate ditemukan:', event.candidate);
                socket.send(JSON.stringify({ ice: event.candidate, targetId }));
                console.log('ICE candidate dikirim ke targetId:', targetId);
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
        const signalingUrl = 'wss://a9b9-2a09-bac1-34c0-18-00-2e5-e.ngrok-free.app'; // Ganti dengan subdomain ngrok yang dihasilkan

        socket = new WebSocket(signalingUrl);
        console.log(`WebSocket menghubungkan ke ${signalingUrl}`);

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

            if (data.type === 'textToVideo') {
                console.log('Pesan text to video diterima:', data.text);
                // Tampilkan video berdasarkan teks yang diterima di sisi lawan bicara
                triggerSignAnimation(data.text, data.videoUrl); 
            }

            if (data.type === 'offer') {
                console.log('Offer diterima dari:', data.fromId);
                callerId = data.fromId;
                acceptCallButton.style.display = 'block';  // Tampilkan tombol Accept
                rejectCallButton.style.display = 'block';  // Tampilkan tombol Reject
                console.log('Tombol Accept dan Reject ditampilkan');
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
                    try {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                        console.log('Remote SDP disetel setelah answer:', data.sdp);
                    } catch (error) {
                        console.error('Kesalahan menyetel remote description:', error);
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
            targetId = targetIdInput.value.trim(); // Pastikan targetId benar-benar ada
            if (!targetId) {
                alert('Silakan masukkan ID target.');
                return;
            }
    
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.send(JSON.stringify({ type: 'offer', sdp: offer, targetId }));
            console.log('Tawaran dikirim ke targetId:', targetId);
        } catch (error) {
            console.error('Kesalahan memulai panggilan:', error);
            alert('Kesalahan memulai panggilan: ' + error.message);
        }
    });

    acceptCallButton.addEventListener('click', async () => {
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

        acceptCallButton.style.display = 'none';  // Sembunyikan tombol Accept setelah panggilan diterima
        rejectCallButton.style.display = 'none';  // Sembunyikan tombol Reject setelah panggilan diterima
    });

    rejectCallButton.addEventListener('click', () => {
        console.log('Panggilan ditolak');
        socket.send(JSON.stringify({ type: 'reject', targetId: callerId }));

        acceptCallButton.style.display = 'none';  // Sembunyikan tombol Accept
        rejectCallButton.style.display = 'none';  // Sembunyikan tombol Reject
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
