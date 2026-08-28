/**
 * DeepSeek AI Service Module (Client-Side API Proxy)
 * Menghubungkan aplikasi web frontend dengan Express Backend /api/generate-akad
 * yang menggunakan DEEPSEEK_API_KEY dari Railway environment variables.
 */

const DeepSeekService = {
  /**
   * Menghasilkan teks redaksi akad dengan memanggil Backend Proxy Railway
   */
  async generateAkadClause(akadData, validationResult) {
    try {
      const response = await fetch('/api/generate-akad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          akadData: akadData,
          validationResult: validationResult
        })
      });

      if (response.ok) {
        const json = await response.json();
        return json.text;
      } else {
        const errJson = await response.json().catch(() => ({ error: 'Unknown Error' }));
        alert(`Error dari Server: ${errJson.error || response.statusText}`);
        return null;
      }
    } catch (err) {
      console.error("Gagal terhubung ke backend API:", err);
      alert("Gagal menghubungkan ke backend server. Pastikan API Key AI Backend sudah terpasang di Railway.");
      return null;
    }
  }
};
