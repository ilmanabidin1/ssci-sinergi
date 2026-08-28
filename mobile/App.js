import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  Share
} from 'react-native';

const BACKEND_URL = 'https://akadsyariahgenerator-production.up.railway.app'; // URL Express Server Railway

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [tipeAkad, setTipeAkad] = useState('Murabahah');
  const [pihakPertama, setPihakPertama] = useState('AKADIFY Syariah');
  const [pihakKedua, setPihakKedua] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [hargaBeli, setHargaBeli] = useState('');
  const [margin, setMargin] = useState('');
  const [tenor, setTenor] = useState('12');
  
  // Progress Bar AI State
  const [generating, setGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [currentContractText, setCurrentContractText] = useState('');

  // Chatbot State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Assalamu\'alaikum wr. wb. Saya adalah AI Konsultan & Pengawas Syariah AKADIFY. Ada yang bisa saya bantu terkait fiqh muamalah atau fatwa DSN-MUI?' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/contracts`);
      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      }
    } catch (e) {
      console.log('Error loading contracts:', e);
    }
  };

  const handleGenerateAkad = async () => {
    if (!pihakKedua || !namaBarang || !hargaBeli) {
      Alert.alert('Peringatan', 'Harap isi seluruh field form akad dengan lengkap.');
      return;
    }

    setGenerating(true);
    setProgressText('⏳ Memvalidasi parameter transaksi...');

    try {
      const akadData = {
        tipeAkad,
        pihakPertama,
        pihakKedua,
        namaBarang,
        hargaBeli: parseFloat(hargaBeli),
        margin: parseFloat(margin || 0),
        tenor: parseInt(tenor)
      };

      setProgressText('🤖 DeepSeek AI sedang menyusun klausul akad syariah...');

      const response = await fetch(`${BACKEND_URL}/api/generate-akad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ akadData })
      });

      if (response.ok) {
        const json = await response.json();
        setCurrentContractText(json.text);

        const newContract = {
          id: `AKD/${tipeAkad.substring(0,3).toUpperCase()}/${Math.floor(100000 + Math.random() * 900000)}`,
          type: tipeAkad,
          pihakKedua,
          date: new Date().toLocaleDateString('id-ID'),
          score: 100,
          content: json.text,
          status: 'DRAFT'
        };

        // Sync to backend persistent volume
        fetch(`${BACKEND_URL}/api/contracts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contract: newContract })
        });

        setContracts([newContract, ...contracts]);
        setActiveTab('document');
      } else {
        Alert.alert('Error', 'Gagal menyusun akad dari server AI.');
      }
    } catch (e) {
      Alert.alert('Error', 'Kendala jaringan ke Backend AKADIFY Server.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendQuickChat = (promptText) => {
    setChatInput(promptText);
    setTimeout(() => {
      handleSendChatWithText(promptText);
    }, 100);
  };

  const handleSendChatWithText = async (customText) => {
    const textToSend = customText || chatInput.trim();
    if (!textToSend) return;

    const userMsg = { role: 'user', content: textToSend };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat-syariah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setChatMessages([...updatedMessages, { role: 'assistant', content: '⚠️ Maaf, terjadi kendala pada AI Advisory.' }]);
      }
    } catch (e) {
      setChatMessages([...updatedMessages, { role: 'assistant', content: '⚠️ Gagal terhubung ke AI Service.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChat = () => {
    handleSendChatWithText(null);
  };

  const handleShareContract = async () => {
    if (!currentContractText) return;
    try {
      await Share.share({
        message: `DOKUMEN AKAD SYARIAH - AKADIFY\n\n${currentContractText}`
      });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Top Header Mobile */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AKADIFY MOBILE</Text>
        <Text style={styles.headerSubtitle}>Smart Sharia Contract & Advisory</Text>
      </View>

      {/* Main Screen Views */}
      <ScrollView style={styles.body}>
        {activeTab === 'dashboard' && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📜 Total Akad Terbit</Text>
              <Text style={styles.statVal}>{contracts.length} Dokumen</Text>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setActiveTab('generator')}>
              <Text style={styles.btnText}>➕ Buat Akad Syariah Dinamis</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={() => setActiveTab('chat')}>
              <Text style={styles.btnTextOutline}>🕌 Konsultasi AI Pengawas Syariah</Text>
            </TouchableOpacity>

            <Text style={styles.subHeading}>Daftar Akad Terbaru</Text>
            {contracts.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada akad yang dibuat.</Text>
            ) : (
              contracts.slice(0, 5).map((item, idx) => (
                <View key={idx} style={styles.contractItem}>
                  <Text style={styles.contractTitle}>{item.type} ({item.id})</Text>
                  <Text style={styles.contractSub}>Pemohon: {item.pihakKedua}</Text>
                  <Text style={styles.contractBadge}>✅ {item.status}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'generator' && (
          <View style={styles.section}>
            <Text style={styles.subHeading}>Form Parameter Akad Syariah</Text>

            <Text style={styles.label}>Nama Pihak Pertama (Penjual / Koperasi)</Text>
            <TextInput style={styles.input} value={pihakPertama} onChangeText={setPihakPertama} />

            <Text style={styles.label}>Nama Pihak Kedua (Pemohon / Anggota)</Text>
            <TextInput style={styles.input} placeholder="Nama Lengkap Pemohon" value={pihakKedua} onChangeText={setPihakKedua} />

            <Text style={styles.label}>Nama Barang / Objek Transaksi</Text>
            <TextInput style={styles.input} placeholder="Contoh: Sepeda Motor Honda Beat" value={namaBarang} onChangeText={setNamaBarang} />

            <Text style={styles.label}>Harga Pembelian Pokok (Rp)</Text>
            <TextInput style={styles.input} placeholder="18000000" keyboardType="numeric" value={hargaBeli} onChangeText={setHargaBeli} />

            <Text style={styles.label}>Margin Keuntungan (Rp)</Text>
            <TextInput style={styles.input} placeholder="2500000" keyboardType="numeric" value={margin} onChangeText={setMargin} />

            <Text style={styles.label}>Tenor (Bulan)</Text>
            <TextInput style={styles.input} placeholder="12" keyboardType="numeric" value={tenor} onChangeText={setTenor} />

            {generating ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#047857" />
                <Text style={styles.loadingText}>{progressText}</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.btnPrimary} onPress={handleGenerateAkad}>
                <Text style={styles.btnText}>⚡ Susun Akad dengan AI</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'document' && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.btnShare} onPress={handleShareContract}>
              <Text style={styles.btnText}>📤 Share / Bagikan Dokumen Akad</Text>
            </TouchableOpacity>

            <View style={styles.paper}>
              <Text style={styles.paperHeader}>AKADIFY - AKAD SYARIAH DIGITAL</Text>
              <Text style={styles.paperBody}>{currentContractText || 'Belum ada dokumen yang dipilih.'}</Text>
            </View>
          </View>
        )}

        {activeTab === 'chat' && (
          <View style={styles.section}>
            <Text style={styles.subHeading}>Konsultan & Pengawas Syariah AI</Text>

            <View style={styles.chatBox}>
              {chatMessages.map((msg, i) => (
                <View key={i} style={[styles.chatBubble, msg.role === 'user' ? styles.userBubble : styles.botBubble]}>
                  <Text style={msg.role === 'user' ? styles.userChatText : styles.botChatText}>{msg.content}</Text>
                </View>
              ))}
              {chatLoading && <ActivityIndicator size="small" color="#047857" style={{ marginTop: 10 }} />}
            </View>

            {/* Quick Suggestion Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <TouchableOpacity style={styles.chipBtn} onPress={() => handleSendQuickChat('Apa bedanya Murabahah bil Wakalah dengan Murabahah biasa?')}>
                <Text style={styles.chipText}>💡 Apa bedanya Murabahah bil Wakalah?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chipBtn} onPress={() => handleSendQuickChat('Bagaimana skema pembiayaan modal kerja sesuai syariah?')}>
                <Text style={styles.chipText}>💡 Skema Modal Kerja Syariah</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chipBtn} onPress={() => handleSendQuickChat('Apa saja rukun dan syarat sah akad Murabahah?')}>
                <Text style={styles.chipText}>💡 Rukun & Syarat Murabahah</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.chatInputRow}>
              <TextInput 
                style={styles.chatInput} 
                placeholder="Tanyakan fiqh muamalah / fatwa DSN-MUI..." 
                value={chatInput} 
                onChangeText={setChatInput} 
              />
              <TouchableOpacity style={styles.btnSend} onPress={handleSendChat}>
                <Text style={styles.btnText}>Kirim</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dashboard')}>
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navActive]}>📊 Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('generator')}>
          <Text style={[styles.navText, activeTab === 'generator' && styles.navActive]}>✍️ Buat Akad</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('document')}>
          <Text style={[styles.navText, activeTab === 'document' && styles.navActive]}>📄 Dokumen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('chat')}>
          <Text style={[styles.navText, activeTab === 'chat' && styles.navActive]}>🕌 AI Chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0f172a', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 12 },
  body: { flex: 1, padding: 15 },
  section: { marginBottom: 20 },
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  cardTitle: { fontSize: 14, color: '#64748b' },
  statVal: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginTop: 5 },
  btnPrimary: { backgroundColor: '#047857', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnShare: { backgroundColor: '#0284c7', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  btnOutline: { borderWidth: 1, borderColor: '#047857', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  btnTextOutline: { color: '#047857', fontWeight: 'bold' },
  subHeading: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginVertical: 10 },
  emptyText: { color: '#94a3b8', fontStyle: 'italic' },
  contractItem: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  contractTitle: { fontWeight: 'bold', color: '#0f172a' },
  contractSub: { color: '#64748b', fontSize: 12 },
  contractBadge: { color: '#16a34a', fontSize: 12, marginTop: 4, fontWeight: 'bold' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', padding: 12, borderRadius: 6, fontSize: 14 },
  loadingBox: { padding: 20, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#047857', fontSize: 13, textAlign: 'center' },
  paper: { backgroundColor: '#ffffff', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  paperHeader: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, color: '#0f172a' },
  paperBody: { fontSize: 13, lineHeight: 22, color: '#334155' },
  chatBox: { backgroundColor: '#ffffff', minHeight: 300, padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  chatBubble: { padding: 12, borderRadius: 8, marginBottom: 8, maxWidth: '85%' },
  userBubble: { backgroundColor: '#d1fae5', alignSelf: 'flex-end' },
  botBubble: { backgroundColor: '#f1f5f9', alignSelf: 'flex-start' },
  userChatText: { color: '#064e3b' },
  botChatText: { color: '#0f172a' },
  chatInputRow: { flexDirection: 'row', gap: 8 },
  chatInput: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 6 },
  btnSend: { backgroundColor: '#047857', padding: 12, borderRadius: 6, justifyContent: 'center' },
  chipBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, marginRight: 8 },
  chipText: { fontSize: 11, color: '#047857', fontWeight: '500' },
  navBar: { flexDirection: 'row', backgroundColor: '#0f172a', borderTopWidth: 1, borderColor: '#1e293b' },
  navItem: { flex: 1, padding: 15, alignItems: 'center' },
  navText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  navActive: { color: '#10b981' }
});
