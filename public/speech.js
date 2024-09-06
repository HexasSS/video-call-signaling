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
            triggerSignAnimation(transcript)    ; 
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
    // Fungsi untuk memutar video/gambar bahasa isyarat satu per satu
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

    // Cari kata di JSON mapping
    const signMedia = signMapping[word];
    
    if (signMedia) {
        // Jika ditemukan di mapping, tampilkan video/gambar sesuai jenisnya
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
        // Jika tidak ditemukan di mapping, pecah kata menjadi huruf-huruf individual
        console.log(`Word "${word}" not found in mapping, splitting into letters.`);
        showSignByLetters(word);
    }
};


// Fungsi untuk menampilkan gambar abjad jika kata tidak ditemukan di mapping
const showSignByLetters = (word) => {
    let delay = 0;
    const letters = word.split('');

    // Tampilkan gambar per abjad dari kata yang dipecah
    letters.forEach((letter) => {
        const lowerCaseLetter = letter.toLowerCase();  // Pastikan huruf kecil untuk mencocokkan JSON mapping
        setTimeout(() => {
            const signMedia = signMapping[lowerCaseLetter];  // Cek apakah ada gambar untuk huruf ini

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

    // Cek dan tampilkan error jika WebSocket tidak terhubung
    if (!socket) {
        console.warn('WebSocket tidak tersedia. Pastikan sudah terhubung.');
    }
});
