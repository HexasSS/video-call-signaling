document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM content loaded, initializing speech recognition...');

    // Cek apakah browser mendukung Web Speech API
    if (!('webkitSpeechRecognition' in window)) {
        alert('Browser tidak mendukung Speech Recognition. Gunakan Chrome atau Edge.');
        console.error('Browser does not support Web Speech API');
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'id-ID';  // Sesuaikan bahasa
    recognition.interimResults = false;
    recognition.continuous = true;

    const speechOutput = document.getElementById('speechOutput');
    const startSpeechButton = document.getElementById('startSpeech');
    const stopSpeechButton = document.getElementById('stopSpeech');
    const signVideo = document.getElementById('signVideo');

    // Inisialisasi untuk WebSocket
    let socket = null;  // Pastikan socket ada dan diinisialisasi
    let targetId = null; // Target ID lawan bicara (pastikan ini di-set saat memulai panggilan)

    // Load JSON mapping untuk video bahasa isyarat
    let signMapping = {};
    fetch('signMapping.json')
        .then(response => response.json())
        .then(data => {
            signMapping = data;
            console.log('Sign language video mapping loaded:', signMapping);
        })
        .catch(error => {
            console.error('Error loading sign language video mapping:', error);
        });

    // Mulai pengenalan suara ketika tombol start ditekan
    startSpeechButton.addEventListener('click', () => {
        recognition.start();
        console.log('Speech recognition started');
    });

    // Hentikan pengenalan suara ketika tombol stop ditekan
    stopSpeechButton.addEventListener('click', () => {
        recognition.stop();
        console.log('Speech recognition stopped');
    });

    // Ketika hasil pengenalan suara diterima
    recognition.onresult = (event) => {
        console.log('Event onresult dipanggil...');
        
        if (event.results && event.results.length > 0) {
            const transcript = event.results[event.resultIndex][0].transcript.trim();
            console.log('Hasil pengenalan suara:', transcript);
            speechOutput.textContent = transcript;  // Tampilkan hasil pengenalan suara di UI
    
            // Kirim hasil speech-to-text ke lawan bicara via WebSocket
            if (socket && targetId) {
                socket.send(JSON.stringify({
                    type: 'textToVideo',
                    text: transcript,
                    targetId: targetId
                }));
                console.log('Pesan teks dikirim ke lawan bicara:', transcript);
            } else {
                console.warn('Socket atau targetId tidak tersedia.');
            }
    
            // Lakukan pemutaran video berdasarkan hasil text di sisi ini
            triggerSignAnimation(transcript); 
        } else {
            console.warn('Tidak ada hasil dari pengenalan suara.');
        }
    };
    
    // Ketika ada kesalahan dalam pengenalan suara
    recognition.onerror = (event) => {
        console.error('Error during speech recognition:', event.error);
        alert('Kesalahan dalam pengenalan suara: ' + event.error);
    };

    // Ketika pengenalan suara dihentikan
    recognition.onend = () => {
        console.log('Speech recognition ended');
    };

    // Fungsi untuk memicu video bahasa isyarat berdasarkan teks
    const triggerSignAnimation = (text) => {
        console.log('Triggering sign language animation for text:', text);
        triggerSignVideos(text);
    };

    // Fungsi untuk memutar video bahasa isyarat satu per satu
    const triggerSignVideos = (text) => {
        const words = text.toLowerCase().split(' ');
        let delay = 0;

        // Memutar video untuk setiap kata, dengan jeda di antaranya
        words.forEach((word) => {
            setTimeout(() => {
                showSignVideo(word);
            }, delay);
            delay += 5000;  // Setiap video diputar selama 5 detik
        });
    };

    // Fungsi untuk menampilkan video bahasa isyarat berdasarkan kata
    const showSignVideo = (word) => {
        signVideo.style.display = 'none';  // Sembunyikan video sebelumnya

        // Cari kata di JSON mapping
        const signVideoName = signMapping[word];
        
        if (signVideoName) {
            signVideo.src = `videos/${signVideoName}`;
            signVideo.style.display = 'block';
            signVideo.play();  // Mulai memutar video
            console.log(`Displaying sign video for word: ${word}`);
        } else {
            console.log(`No matching sign video found for word: ${word}`);
        }
    };

    // Cek dan tampilkan error jika WebSocket tidak terhubung
    if (!socket) {
        console.warn('WebSocket tidak tersedia. Pastikan sudah terhubung.');
    }
});
