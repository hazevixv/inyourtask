import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { groqChatText, hasGroqConfig } from '@/lib/groq';

function getSystemPromptInstruction(brief: string, name: string): string {
  return `Buat SYSTEM PROMPT yang SANGAT LENGKAP dan DETAIL untuk AI Worker bernama "${name || 'AI Worker'}" berdasarkan BRIEF berikut:

BRIEF: "${brief}"

System prompt ini adalah OTAK dan INSTRUKSI UTAMA AI Worker. Buat SANGAT LENGKAP (minimal 500 kata) dengan struktur WAJIB berikut:

## 1. IDENTITAS & PERAN
"Kamu adalah [NAMA AI], [SPESIALISASI] di [BIDANG]."
Jelaskan secara spesifik siapa AI ini, bidang keahlian, dan level keahliannya.

## 2. MISI UTAMA
Apa tujuan utama AI ini? Siapa yang dibantu? Masalah apa yang dipecahkan?

## 3. AREA KEAHLIAN (EXPERTISE)
Buat 4-6 poin area spesifik dimana AI ini ahli. Contoh:
- Strategi konten marketing
- Analisis data engagement 
- Penjadwalan dan optimasi posting
- Copywriting dan brand voice

## 4. CARA BEKERJA
Buat 5-7 poin cara kerja yang jelas:
- Bagaimana AI merespon pertanyaan
- Bagaimana AI memberikan rekomendasi
- Format output yang digunakan
- Kapan AI proaktif memberi saran
- Bagaimana AI menangani data/analisis
- Prioritas dalam memberikan jawaban

## 5. FORMAT RESPON
Tentukan format respons yang harus digunakan:
- Struktur jawaban (pembukaan, isi, penutup)
- Penggunaan poin, tabel, atau format lain
- Panjang respons (singkat/medium/detail)
- Kapan menggunakan data/angka

## 6. KEPRIBADIAN & TONE
- Tone bicara (profesional, hangat, tegas, santai)
- Tingkat formalitas
- Penggunaan emoji atau bahasa informal
- Cara menyapa user

## 7. BATASAN & ETIKA
Apa yang TIDAK BOLEH dilakukan AI ini:
- Jangan mengaku sebagai manusia
- Jangan memberikan saran di luar kompetensi
- Jangan membagikan informasi sensitif
- Jangan membuat keputusan tanpa persetujuan user

## 8. INISIATIF PROAKTIF
Kapan AI HARUS proaktif:
- Memberi saran tanpa diminta
- Mengingatkan deadline/jadwal
- Menawarkan optimasi
- Melaporkan anomali

## 9. KONTEKS LINGKUNGAN
AI ini bekerja di platform manajemen task. Pahami bahwa:
- User punya task, project, dan deadline
- AI bisa create/update task dan project
- AI harus integrasi dengan workflow user
- Utamakan Bahasa Indonesia

Tulis system prompt LENGKAP dalam Bahasa Indonesia yang natural. Jangan gunakan markdown untuk struktur internal (gunakan format teks biasa dengan baris baru). Pisahkan setiap section dengan baris kosong.
Return ONLY the system prompt.`;
}

function getKnowledgeBaseInstruction(brief: string): string {
  return `Buat KNOWLEDGE BASE yang SANGAT LENGKAP untuk AI Worker berdasarkan BRIEF berikut:

BRIEF: "${brief}"

Knowledge base adalah PENGETAHUAN KHUSUS yang harus dikuasai AI Worker. Buat SANGAT DETAIL (minimal 300 kata) dengan struktur WAJIB berikut:

## A. KONSEP DASAR & DEFINISI
Jelaskan 3-5 konsep fundamental yang terkait dengan bidang AI ini

## B. TERMINOLOGI & ISTILAH PENTING
Daftar 5-8 istilah teknis yang wajib dipahami, lengkap dengan definisi singkat

## C. METODOLOGI & FRAMEWORK
Framework, metode, atau pendekatan yang relevan di bidang ini (2-3 framework)

## D. METRIK & INDIKATOR KEBERHASILAN
Key metrics / KPI yang biasa digunakan di bidang ini (3-5 metrik)

## E. BEST PRACTICES
5-7 praktik terbaik yang harus diketahui dan diterapkan

## F. TOOLS & PLATFORM RELEVAN
Tools/platform yang umum digunakan di bidang ini (3-5 tool)

## G. COMMON PITFALLS
3-4 kesalahan umum yang sering terjadi dan harus dihindari

## H. TREN & UPDATE TERKINI
Perkembangan terbaru atau tren di bidang ini (2-3 poin)

Return ONLY the knowledge base text. Gunakan Bahasa Indonesia. Gunakan format teks biasa.`;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireUser(request);
    if ('response' in authResult) return authResult.response;

    if (!hasGroqConfig()) {
      return NextResponse.json({ success: false, error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const { action, field, value, brief } = await request.json();

    if (action === 'autofill') {
      if (!brief || brief.trim().length < 5) {
        return NextResponse.json({ success: false, error: 'Brief terlalu pendek (min 5 karakter)' }, { status: 400 });
      }

      const prompt = `Kamu adalah AI Agent Designer expert. Berdasarkan brief berikut, buat konfigurasi LENGKAP untuk AI Worker yang SANGAT CERDAS dan AKURAT.

BRIEF:
"${brief}"

Buat JSON dengan format EXACT berikut (field "system_prompt" dan "knowledge_base" harus SANGAT LENGKAP):

{
  "name": "Nama singkat AI Worker (maks 5 kata, Bahasa Indonesia, profesional)",
  "description": "Deskripsi 2-3 kalimat dalam Bahasa Indonesia yang menjelaskan secara jelas kemampuan utama AI Worker ini",
  "role": "Job title / spesialisasi spesifik (contoh: Project Manager AI, Social Media Marketing Assistant, Data Analyst AI, Content Strategist)",
  "system_prompt": "SISTEM PROMPT LENGKAP minimal 500 kata. Gunakan template berikut:\n\nKamu adalah [NAMA AI], [SPESIALISASI].\n\nMISI UTAMA:\n[2-3 kalimat misi utama]\n\nAREA KEAHLIAN:\n- [Poin 1]\n- [Poin 2]\n- [Poin 3]\n- [Poin 4]\n\nCARA BEKERJA:\n1. [Cara kerja 1]\n2. [Cara kerja 2]\n3. [Cara kerja 3]\n4. [Cara kerja 4]\n5. [Cara kerja 5]\n\nFORMAT RESPON:\n- [Format 1]\n- [Format 2]\n\nKEPRIBADIAN:\n- [Sifat 1]\n- [Sifat 2]\n\nBATASAN:\n- [Batasan 1]\n- [Batasan 2]\n\nPROAKTIF:\n- [Inisiatif 1]\n- [Inisiatif 2]",
  "knowledge_base": "KNOWLEDGE BASE LENGKAP minimal 300 kata. Gunakan template:\n\nKONSEP DASAR:\n- [Konsep 1]\n- [Konsep 2]\n\nISTILAH PENTING:\n- [Istilah 1]: definisi\n- [Istilah 2]: definisi\n\nMETODOLOGI:\n- [Framework 1]\n- [Framework 2]\n\nBEST PRACTICES:\n- [Practice 1]\n- [Practice 2]\n\nMETRIK KUNCI:\n- [Metrik 1]\n- [Metrik 2]",
  "avatar_prompt": "PROMPT AVATAR: deskripsi singkat untuk generate gambar avatar AI Worker (10-20 kata, Bahasa Inggris, gaya digital art). Contoh: 'A futuristic robot assistant with blue holographic interface, digital art, professional style'",
  "model": "openai/gpt-oss-20b"
}

KRUSIAL: system_prompt dan knowledge_base harus SANGAT LENGKAP dan DETAIL. Ini adalah OTAK dari AI Worker. Jangan pelit kata!
Return ONLY valid JSON, no markdown, no backticks.`;

      const { text } = await groqChatText({
        mode: 'reasoning',
        messages: [
          { role: 'system', content: 'You are an AI Agent configuration expert. Always respond with valid JSON only. system_prompt dan knowledge_base harus sangat lengkap dan detail — minimal 500 kata untuk system_prompt dan 300 kata untuk knowledge_base.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.45,
        maxTokens: 4000
      });

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : text;
        const result = JSON.parse(jsonText);

        // Ensure minimum quality
        if (!result.system_prompt || result.system_prompt.length < 300) {
          result.system_prompt = `Kamu adalah ${result.name || 'AI Worker'}, ${result.role || 'asisten AI profesional'}.

MISI UTAMA:
${brief}

AREA KEAHLIAN:
- Analisis dan eksekusi tugas sesuai bidang keahlian
- Memberikan rekomendasi yang data-driven dan actionable
- Berkomunikasi secara efektif dalam Bahasa Indonesia
- Integrasi dengan workflow dan tools yang ada

CARA BEKERJA:
1. Pahami konteks dan kebutuhan user sebelum memberikan jawaban
2. Berikan solusi yang spesifik, terukur, dan actionable
3. Gunakan data dan fakta dalam setiap rekomendasi
4. Prioritaskan jawaban yang paling relevan dan berdampak
5. Tawarkan langkah selanjutnya secara proaktif

FORMAT RESPON:
- Gunakan Bahasa Indonesia yang jelas dan profesional
- Struktur jawaban: pembukaan → isi → kesimpulan → langkah selanjutnya
- Gunakan poin-poin untuk informasi yang kompleks
- Sertakan contoh konkret jika relevan

KEPRIBADIAN:
- Profesional, ramah, dan suportif
- Antusias dalam membantu dan memberikan solusi
- Jujur dan transparan tentang keterbatasan

BATASAN:
- Tidak memberikan saran di luar kompetensi
- Tidak membagikan informasi rahasia atau sensitif
- Selalu meminta klarifikasi jika instruksi kurang jelas
- Tidak membuat keputusan final tanpa persetujuan user`;
        }

        if (!result.knowledge_base || result.knowledge_base.length < 150) {
          result.knowledge_base = `KONSEP DASAR:
- Pemahaman mendalam tentang bidang spesifikasi AI Worker ini
- Best practice dan standar industri yang berlaku
- Metodologi dan framework yang relevan

ISTILAH PENTING:
- Key performance indicators yang relevan
- Tools dan platform utama di bidang ini
- Terminologi teknis yang umum digunakan

BEST PRACTICES:
- Selalu validasi data sebelum memberikan rekomendasi
- Gunakan pendekatan berbasis bukti dalam setiap analisis
- Prioritaskan actionable insights dibanding teori
- Sesuaikan komunikasi dengan level pemahaman user

METRIK KUNCI:
- Ukuran keberhasilan yang relevan dengan bidang
- Target dan benchmark industri
- Cara mengukur dan melaporkan progress`;
        }

        return NextResponse.json({ success: true, result });
      } catch {
        return NextResponse.json({ success: false, error: 'Gagal parse response AI. Coba lagi.' }, { status: 500 });
      }
    } else if (action === 'enhance') {
      if (!field) {
        return NextResponse.json({ success: false, error: 'field required' }, { status: 400 });
      }

      const fieldPrompts: Record<string, string> = {
        name: `Berdasarkan brief berikut, buat NAMA yang lebih baik untuk AI Worker ini.
BRIEF: "${brief || '-'}"
VALUE SAAT INI: "${value || '-'}"

Buat nama baru (maks 5 kata, Bahasa Indonesia, profesional, mencerminkan peran dengan tepat).
Return ONLY the name, no explanation.`,

        description: `Berdasarkan brief berikut, buat DESKRIPSI yang lebih baik untuk AI Worker ini.
BRIEF: "${brief || '-'}"  
VALUE SAAT INI: "${value || '-'}"

Buat deskripsi 2-3 kalimat dalam Bahasa Indonesia yang menjelaskan secara jelas dan spesifik kemampuan utama AI ini.
Return ONLY the description, no explanation.`,

        role: `Berdasarkan brief berikut, buat ROLE/JOB TITLE yang lebih baik untuk AI Worker ini.
BRIEF: "${brief || '-'}"
VALUE SAAT INI: "${value || '-'}"

Buat role/spesialisasi yang spesifik dan profesional dalam Bahasa Indonesia (contoh: Project Manager AI, Social Media Marketing Assistant, Data Analyst AI, Content Strategist).
Return ONLY the role, no explanation.`,

        system_prompt: getSystemPromptInstruction(brief || value || '-', value || ''),

        knowledge_base: getKnowledgeBaseInstruction(brief || value || '-'),
      };

      const prompt = fieldPrompts[field] || `Enhance ${field} for AI Worker with brief: ${brief}`;
      const maxToks = field === 'system_prompt' ? 3000 : field === 'knowledge_base' ? 2500 : 500;

      const { text } = await groqChatText({
        mode: field === 'system_prompt' || field === 'knowledge_base' ? 'reasoning' : 'fast',
        messages: [
          { role: 'system', content: 'You are an AI Agent configuration expert. Buat konten yang SANGAT LENGKAP dan DETAIL. Jangan pelit kata. Gunakan Bahasa Indonesia.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        maxTokens: maxToks
      });

      return NextResponse.json({ success: true, result: text.trim() });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'AI enhancement failed' }, { status: 500 });
  }
}
