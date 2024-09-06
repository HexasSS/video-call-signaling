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
    
            // Ganti URL video sesuai dengan hasil pengenalan suara
            playSignVideo(transcript);
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

    // Fungsi untuk memutar video berdasarkan hasil pengenalan suara
    const playSignVideo = (text) => {
        const words = text.split(' '); // Memisahkan kalimat menjadi kata-kata
        let delay = 0;
    
        words.forEach((word) => {
            setTimeout(() => {
                const formattedWord = capitalizeFirstLetter(word);
                const videoUrl = `https://pmpk.kemdikbud.go.id/sibi/SIBI/katadasar/${formattedWord}.webm`;
    
                // Menampilkan video di local device
                signVideo.src = videoUrl;
                signVideo.style.display = 'block';
                signVideo.play();
    
                // Mengirim hasil ke lawan bicara
                if (socket && targetId) {
                    socket.send(JSON.stringify({
                        type: 'textToVideo',
                        text: word,
                        videoUrl: videoUrl,
                        targetId: targetId  // Kirim ke ID lawan bicara
                    }));
                }
    
                console.log(`Playing sign language video for word: ${formattedWord} from: ${videoUrl}`);
            }, delay);
    
            delay += 5000;  // Jeda 5 detik sebelum memutar video kata berikutnya
        });
    
    
};


    // Fungsi untuk mengkapitalisasi huruf pertama pada hasil pengenalan suara
    const capitalizeFirstLetter = (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    };
});

