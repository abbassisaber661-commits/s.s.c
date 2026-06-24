// ─── Phase B: Question Foundation System ─────────────────────────────────────
// Centralized question pool for SkillLeague competitive matches.
// Supports: Sports · Culture · Geography · History · Philosophy ·
//           Religious · Visual Attention · Puzzle Assembly

import type { Language } from './i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KnowledgeCategory =
  | 'sports'
  | 'culture'
  | 'geography'
  | 'history'
  | 'philosophy'
  | 'religious'
  | 'famous_people';

export type QuestionCategory = KnowledgeCategory | 'visual_attention' | 'puzzle_assembly';

export type DivisionTier = 'div3' | 'div2' | 'pro' | 'champions';

export type TimerModel = 'countdown' | 'puzzle';

/** Bilingual text with optional extra language support */
export interface TranslationSet {
  en:   string;
  ar:   string;
  fr?:  string;
  es?:  string;
  de?:  string;
  pt?:  string;
  tr?:  string;
  hi?:  string;
  zh?:  string;
  ru?:  string;
}

// ─── Knowledge Question ───────────────────────────────────────────────────────

export interface KnowledgeQuestion {
  id:           string;
  type:         'knowledge';
  category:     KnowledgeCategory;
  /** Difficulty levels: 1=div3(easy) 2=div2(medium) 3=pro(hard) 4=champions(very hard) */
  difficulties: number[];
  timeLimitMs:  number;
  timerModel:   TimerModel;
  q:            TranslationSet;
  o:            [TranslationSet, TranslationSet, TranslationSet, TranslationSet];
  /** Correct option index (0–3). NEVER changes with language. */
  c:            0 | 1 | 2 | 3;
}

// ─── Visual Attention Question ────────────────────────────────────────────────
// Goal: test reading accuracy and attention.
// The instruction usually asks for something DIFFERENT from what is displayed.

export interface VisualAttentionQuestion {
  id:           string;
  type:         'visual_attention';
  category:     'visual_attention';
  difficulties: number[];
  timeLimitMs:  number;
  timerModel:   TimerModel;
  /** Emoji(s) displayed to the player */
  display:      string;
  /** Options shown — emoji or short text, language-independent */
  opts:         [string, string, string, string];
  /** Instruction text (requires reading, not just looking) */
  instr:        TranslationSet;
  c:            0 | 1 | 2 | 3;
}

// ─── Puzzle / Assembly Question ───────────────────────────────────────────────
// Timer model: 'puzzle' (longer, different UX).
// pieceCount stored for future interactive drag-and-drop UI.

export interface PuzzleAssemblyQuestion {
  id:           string;
  type:         'puzzle_assembly';
  category:     'puzzle_assembly';
  difficulties: number[];
  timeLimitMs:  number;
  timerModel:   'puzzle';
  /** div3:7-10  div2:10-15  pro:15-25  champions:25+ */
  pieceCount:   number;
  instr:        TranslationSet;
  /** 4 assembly sequence options — emoji-based, language-independent */
  opts:         [string, string, string, string];
  c:            0 | 1 | 2 | 3;
}

export type PoolQuestion =
  | KnowledgeQuestion
  | VisualAttentionQuestion
  | PuzzleAssemblyQuestion;

// ─── Translation helpers ──────────────────────────────────────────────────────

export function getLang(set: TranslationSet, lang: Language): string {
  const v = (set as unknown as Record<string, string>)[lang];
  return v ?? set.ar ?? set.en;
}

export function getQuestionText(q: PoolQuestion, lang: Language): string {
  if (q.type === 'knowledge')        return getLang(q.q, lang);
  if (q.type === 'visual_attention') return getLang(q.instr, lang);
  if (q.type === 'puzzle_assembly')  return getLang(q.instr, lang);
  return '';
}

export function getQuestionOptions(q: PoolQuestion, lang: Language): string[] {
  if (q.type === 'knowledge')        return q.o.map(o => getLang(o, lang));
  if (q.type === 'visual_attention') return [...q.opts];
  if (q.type === 'puzzle_assembly')  return [...q.opts];
  return [];
}

// ─── Compact question constructors ────────────────────────────────────────────

function kn(
  id: string,
  cat: KnowledgeCategory,
  diffs: number[],
  ms: number,
  enq: string, eno: [string, string, string, string],
  arq: string, aro: [string, string, string, string],
  c: 0|1|2|3,
  frq?: string, fro?: [string, string, string, string],
  esq?: string, eso?: [string, string, string, string],
): KnowledgeQuestion {
  return {
    id, type: 'knowledge', category: cat, difficulties: diffs, timeLimitMs: ms, timerModel: 'countdown',
    q: { en: enq, ar: arq, ...(frq ? { fr: frq } : {}), ...(esq ? { es: esq } : {}) },
    o: [
      { en: eno[0], ar: aro[0], ...(fro ? { fr: fro[0] } : {}), ...(eso ? { es: eso[0] } : {}) },
      { en: eno[1], ar: aro[1], ...(fro ? { fr: fro[1] } : {}), ...(eso ? { es: eso[1] } : {}) },
      { en: eno[2], ar: aro[2], ...(fro ? { fr: fro[2] } : {}), ...(eso ? { es: eso[2] } : {}) },
      { en: eno[3], ar: aro[3], ...(fro ? { fr: fro[3] } : {}), ...(eso ? { es: eso[3] } : {}) },
    ] as [TranslationSet, TranslationSet, TranslationSet, TranslationSet],
    c,
  };
}

function va(
  id: string,
  diffs: number[],
  ms: number,
  display: string,
  opts: [string, string, string, string],
  en_i: string,
  ar_i: string,
  c: 0|1|2|3,
): VisualAttentionQuestion {
  return {
    id, type: 'visual_attention', category: 'visual_attention',
    difficulties: diffs, timeLimitMs: ms, timerModel: 'countdown',
    display, opts, instr: { en: en_i, ar: ar_i }, c,
  };
}

function pz(
  id: string,
  diffs: number[],
  ms: number,
  pieceCount: number,
  opts: [string, string, string, string],
  en_i: string,
  ar_i: string,
  c: 0|1|2|3,
): PuzzleAssemblyQuestion {
  return {
    id, type: 'puzzle_assembly', category: 'puzzle_assembly',
    difficulties: diffs, timeLimitMs: ms, timerModel: 'puzzle',
    pieceCount, opts, instr: { en: en_i, ar: ar_i }, c,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SPORTS POOL
// Covers: Players · Teams · Coaches · Referees · Tournaments · World Cup ·
//         Champions League · Rules · Records · Stadiums · National teams ·
//         Famous moments · Statistics · Sports history
// ═════════════════════════════════════════════════════════════════════════════

export const SPORTS_POOL: KnowledgeQuestion[] = [

  // ── Division III (difficulty 1) — entry level ──────────────────────────────

  kn('SP001', 'sports', [1], 15000,
    'How many players are in a standard football team?',
    ['9', '10', '11', '12'],
    'كم عدد لاعبي فريق كرة القدم الواحد؟',
    ['٩', '١٠', '١١', '١٢'],
    2,
    'Combien de joueurs dans une équipe de football standard ?',
    ['9', '10', '11', '12'],
    '¿Cuántos jugadores hay en un equipo de fútbol estándar?',
    ['9', '10', '11', '12'],
  ),

  kn('SP002', 'sports', [1], 15000,
    'How often is the FIFA World Cup held?',
    ['Every 2 years', 'Every 4 years', 'Every 3 years', 'Every 6 years'],
    'كم مرة تُقام بطولة كأس العالم لكرة القدم؟',
    ['كل سنتين', 'كل 4 سنوات', 'كل 3 سنوات', 'كل 6 سنوات'],
    1,
    'À quelle fréquence se tient la Coupe du Monde de la FIFA ?',
    ['Tous les 2 ans', 'Tous les 4 ans', 'Tous les 3 ans', 'Tous les 6 ans'],
  ),

  kn('SP003', 'sports', [1], 15000,
    'Which country has won the most FIFA World Cups?',
    ['Germany', 'Brazil', 'Italy', 'Argentina'],
    'أي دولة فازت بأكبر عدد من بطولات كأس العالم؟',
    ['ألمانيا', 'البرازيل', 'إيطاليا', 'الأرجنتين'],
    1,
    'Quel pays a remporté le plus de Coupes du Monde de la FIFA ?',
    ['Allemagne', 'Brésil', 'Italie', 'Argentine'],
    '¿Qué país ha ganado más Copas del Mundo de la FIFA?',
    ['Alemania', 'Brasil', 'Italia', 'Argentina'],
  ),

  kn('SP004', 'sports', [1], 15000,
    'Who won the 2022 FIFA World Cup?',
    ['France', 'Brazil', 'Argentina', 'Croatia'],
    'من فاز بكأس العالم 2022؟',
    ['فرنسا', 'البرازيل', 'الأرجنتين', 'كرواتيا'],
    2,
  ),

  kn('SP005', 'sports', [1], 15000,
    "Which player is nicknamed 'CR7'?",
    ['Neymar', 'Messi', 'Ronaldo', 'Mbappé'],
    "ما اسم اللاعب الملقب بـ 'CR7'؟",
    ['نيمار', 'ميسي', 'رونالدو', 'مبابي'],
    2,
  ),

  kn('SP006', 'sports', [1], 15000,
    "Who is known as 'La Pulga' (The Flea)?",
    ['Cristiano Ronaldo', 'Neymar', 'Kylian Mbappé', 'Lionel Messi'],
    "من يُعرف بلقب 'البرغوث'؟",
    ['كريستيانو رونالدو', 'نيمار', 'كيليان مبابي', 'ليونيل ميسي'],
    3,
  ),

  kn('SP007', 'sports', [1], 15000,
    'How many minutes does a standard football match last?',
    ['80 minutes', '90 minutes', '100 minutes', '120 minutes'],
    'كم دقيقة يستمر مباراة كرة القدم القياسية؟',
    ['٨٠ دقيقة', '٩٠ دقيقة', '١٠٠ دقيقة', '١٢٠ دقيقة'],
    1,
  ),

  kn('SP008', 'sports', [1], 15000,
    'How many substitutions are allowed per team in a modern football match?',
    ['3', '4', '5', '6'],
    'كم عدد التبديلات المسموح بها لكل فريق في كرة القدم الحديثة؟',
    ['٣', '٤', '٥', '٦'],
    2,
  ),

  // ── Division II (difficulty 2) — intermediate ──────────────────────────────

  kn('SP009', 'sports', [2], 12000,
    'Who holds the record for most FIFA World Cup goals across all tournaments?',
    ['Pelé', 'Miroslav Klose', 'Ronaldo Nazário', 'Gerd Müller'],
    'من يحمل الرقم القياسي بأكثر عدد من الأهداف في كأس العالم عبر التاريخ؟',
    ['بيليه', 'ميروسلاف كلوسه', 'رونالدو نازاريو', 'غيرد مولر'],
    1,
  ),

  kn('SP010', 'sports', [2], 12000,
    'Which club has won the most UEFA Champions League titles?',
    ['FC Barcelona', 'Bayern Munich', 'Real Madrid', 'Liverpool FC'],
    'أي نادٍ فاز بأكبر عدد من ألقاب دوري أبطال أوروبا؟',
    ['برشلونة', 'بايرن ميونخ', 'ريال مدريد', 'ليفربول'],
    2,
  ),

  kn('SP011', 'sports', [2], 12000,
    "What year did Cristiano Ronaldo win his first Ballon d'Or award?",
    ['2006', '2007', '2008', '2009'],
    'في أي عام فاز كريستيانو رونالدو بجائزة الكرة الذهبية لأول مرة؟',
    ['٢٠٠٦', '٢٠٠٧', '٢٠٠٨', '٢٠٠٩'],
    2,
  ),

  kn('SP012', 'sports', [2], 12000,
    'Which country hosted the 2010 FIFA World Cup?',
    ['Brazil', 'South Africa', 'Germany', 'Russia'],
    'أي دولة استضافت كأس العالم 2010؟',
    ['البرازيل', 'جنوب أفريقيا', 'ألمانيا', 'روسيا'],
    1,
  ),

  kn('SP013', 'sports', [2], 12000,
    'Who is the all-time top scorer in UEFA Champions League history?',
    ['Lionel Messi', 'Karim Benzema', 'Cristiano Ronaldo', 'Robert Lewandowski'],
    'من هو الهداف التاريخي لدوري أبطال أوروبا؟',
    ['ليونيل ميسي', 'كريم بنزيمة', 'كريستيانو رونالدو', 'روبرت ليفاندوفسكي'],
    2,
  ),

  kn('SP014', 'sports', [2], 12000,
    'Who managed Spain to their 2010 FIFA World Cup victory?',
    ['Luis Aragonés', 'Vicente del Bosque', 'Julen Lopetegui', 'Luis Enrique'],
    'من قاد منتخب إسبانيا للفوز بكأس العالم 2010؟',
    ['لويس أراغونيس', 'فيسنتي ديل بوسكي', 'خولن لوبيتيغي', 'لويس إنريكي'],
    1,
  ),

  kn('SP015', 'sports', [2], 12000,
    "Which league is nicknamed 'La Liga'?",
    ['Italian Serie A', 'English Premier League', "Spanish Primera División", "French Ligue 1"],
    "ما هو الدوري المعروف بـ'لا ليغا'؟",
    ['الدوري الإيطالي سيريا أ', 'الدوري الإنجليزي الممتاز', 'الدوري الإسباني الأول', 'الدوري الفرنسي الأول'],
    2,
  ),

  kn('SP016', 'sports', [2], 12000,
    'Who is known as "O Rei do Futebol" (The King of Football)?',
    ['Diego Maradona', 'Ronaldo Nazário', 'Pelé', 'Zico'],
    'من يُعرف بلقب "أو ريي دو فوتيبول" (ملك كرة القدم)؟',
    ['دييغو مارادونا', 'رونالدو نازاريو', 'بيليه', 'زيكو'],
    2,
  ),

  // ── Pro League (difficulty 3) — advanced ───────────────────────────────────

  kn('SP017', 'sports', [3], 10000,
    "Who scored the famous 'Hand of God' goal in the 1986 World Cup?",
    ['Carlos Valderrama', 'Diego Maradona', 'Gary Lineker', 'Michel Platini'],
    "من سجل هدف 'يد الله' الشهير في كأس العالم 1986؟",
    ['كارلوس فالديراما', 'دييغو مارادونا', 'غاري لينيكر', 'ميشيل بلاتيني'],
    1,
  ),

  kn('SP018', 'sports', [3], 10000,
    'What is the name of FC Barcelona\'s home stadium?',
    ['Wanda Metropolitano', 'Camp Nou', 'La Cartuja', 'Santiago Bernabéu'],
    'ما هو اسم الملعب الرئيسي لنادي برشلونة؟',
    ['واندا ميتروبوليتانو', 'كامب نو', 'لا كارتوجا', 'سانتياغو برنابيو'],
    1,
  ),

  kn('SP019', 'sports', [3], 10000,
    "How many Ballon d'Or awards has Lionel Messi won (as of 2023)?",
    ['6', '7', '8', '9'],
    'كم مرة فاز ليونيل ميسي بجائزة الكرة الذهبية حتى عام 2023؟',
    ['٦', '٧', '٨', '٩'],
    2,
  ),

  kn('SP020', 'sports', [3], 10000,
    "Which country's national team is nicknamed 'Die Mannschaft'?",
    ['Austria', 'Germany', 'Netherlands', 'Switzerland'],
    "أي منتخب كرة قدم يُعرف بلقب 'دي مانشافت'؟",
    ['النمسا', 'ألمانيا', 'هولندا', 'سويسرا'],
    1,
  ),

  kn('SP021', 'sports', [3], 10000,
    'Who refereed the 2014 FIFA World Cup final?',
    ['Howard Webb', 'Nicola Rizzoli', 'Björn Kuipers', 'Cüneyt Çakır'],
    'من حكّم نهائي كأس العالم 2014؟',
    ['هاورد ويب', 'نيكولا ريزولي', 'بيورن كيبرس', 'جونيت تشاكر'],
    1,
  ),

  kn('SP022', 'sports', [3], 10000,
    'In what year did Brazil suffer their historic 7–1 World Cup defeat?',
    ['2010', '2012', '2014', '2018'],
    'في أي عام تعرضت البرازيل للهزيمة التاريخية بسبعة أهداف لواحد في كأس العالم؟',
    ['٢٠١٠', '٢٠١٢', '٢٠١٤', '٢٠١٨'],
    2,
  ),

  kn('SP023', 'sports', [3], 10000,
    'Who was the top scorer at the 1986 FIFA World Cup with 6 goals?',
    ['Diego Maradona', 'Michel Platini', 'Gary Lineker', 'Emilio Butragueño'],
    'من كان الهداف الأول لكأس العالم 1986 بـ 6 أهداف؟',
    ['دييغو مارادونا', 'ميشيل بلاتيني', 'غاري لينيكر', 'إيميليو بوتراغينيو'],
    2,
  ),

  // ── Champions League (difficulty 4) — elite ───────────────────────────────

  kn('SP024', 'sports', [4], 8000,
    'Who was the first player to win the UEFA Champions League with three different clubs?',
    ['Andrés Iniesta', 'Clarence Seedorf', 'Roberto Carlos', 'Ronaldo Nazário'],
    'من هو أول لاعب يفوز بدوري أبطال أوروبا مع ثلاثة أندية مختلفة؟',
    ['أندريس إنييستا', 'كلارنس سيدورف', 'روبرتو كارلوس', 'رونالدو نازاريو'],
    1,
  ),

  kn('SP025', 'sports', [4], 8000,
    'What is the fastest goal ever scored in a FIFA World Cup match?',
    ['10 seconds by Hakan Şükür', '11 seconds by Hakan Şükür', '15 seconds by Clint Dempsey', '20 seconds by Václav Mašek'],
    'ما هو أسرع هدف في تاريخ بطولة كأس العالم؟',
    ['١٠ ثوانٍ لهاكان شوكور', '١١ ثانية لهاكان شوكور', '١٥ ثانية لكلينت ديمبسي', '٢٠ ثانية لفاتسلاف ماشيك'],
    1,
  ),

  kn('SP026', 'sports', [4], 8000,
    'What was the exact final score in the 1994 World Cup final between Brazil and Italy?',
    ['1–0 (Brazil)', '2–1 (Brazil)', '0–0 (penalties)', '1–1 (penalties)'],
    'ما كانت نتيجة نهائي كأس العالم 1994 بين البرازيل وإيطاليا؟',
    ['١-٠ (البرازيل)', '٢-١ (البرازيل)', '٠-٠ (ركلات الترجيح)', '١-١ (ركلات الترجيح)'],
    2,
  ),

  kn('SP027', 'sports', [4], 8000,
    'Which club did Zinedine Zidane join from Juventus in 2001?',
    ['AC Milan', 'Bayern Munich', 'Real Madrid', 'Manchester United'],
    'أي نادٍ انتقل إليه زين الدين زيدان من يوفنتوس عام 2001؟',
    ['AC ميلان', 'بايرن ميونخ', 'ريال مدريد', 'مانشستر يونايتد'],
    2,
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// CULTURE POOL
// ═════════════════════════════════════════════════════════════════════════════

export const CULTURE_POOL: KnowledgeQuestion[] = [

  kn('CU001', 'culture', [1], 15000,
    'Who painted the Mona Lisa?',
    ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Botticelli'],
    'من رسم لوحة الموناليزا؟',
    ['مايكل أنجلو', 'ليوناردو دا فينشي', 'رافائيل', 'بوتيتشيلي'],
    1,
    'Qui a peint la Joconde ?',
    ['Michel-Ange', 'Léonard de Vinci', 'Raphaël', 'Botticelli'],
  ),

  kn('CU002', 'culture', [1], 15000,
    'What is the name of the world\'s tallest building?',
    ['Empire State Building', 'Shanghai Tower', 'Burj Khalifa', 'CN Tower'],
    'ما هو اسم أطول مبنى في العالم؟',
    ['إمباير ستيت بيلدنج', 'برج شنغهاي', 'برج خليفة', 'برج CN'],
    2,
  ),

  kn('CU003', 'culture', [1], 15000,
    "Who wrote 'Romeo and Juliet'?",
    ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Victor Hugo'],
    "من كتب مسرحية 'روميو وجولييت'؟",
    ['تشارلز ديكنز', 'وليم شكسبير', 'مارك توين', 'فيكتور هوغو'],
    1,
  ),

  kn('CU004', 'culture', [1], 15000,
    'What is the main language spoken in Brazil?',
    ['Spanish', 'French', 'Portuguese', 'English'],
    'ما هي اللغة الرسمية في البرازيل؟',
    ['الإسبانية', 'الفرنسية', 'البرتغالية', 'الإنجليزية'],
    2,
    'Quelle est la langue principale parlée au Brésil ?',
    ['Espagnol', 'Français', 'Portugais', 'Anglais'],
  ),

  kn('CU005', 'culture', [2], 12000,
    'In what year was the Eiffel Tower completed?',
    ['1879', '1885', '1889', '1892'],
    'في أي عام اكتمل بناء برج إيفل؟',
    ['١٨٧٩', '١٨٨٥', '١٨٨٩', '١٨٩٢'],
    2,
    'En quelle année la tour Eiffel a-t-elle été achevée ?',
    ['1879', '1885', '1889', '1892'],
  ),

  kn('CU006', 'culture', [2], 12000,
    "Who composed 'The Four Seasons'?",
    ['Wolfgang Mozart', 'Antonio Vivaldi', 'Ludwig van Beethoven', 'Johann Sebastian Bach'],
    "من ألّف موسيقى 'فصول السنة الأربعة'؟",
    ['فولفغانغ موزارت', 'أنطونيو فيفالدي', 'لودفيغ فان بيتهوفن', 'يوهان سيباستيان باخ'],
    1,
  ),

  kn('CU007', 'culture', [2], 12000,
    "What nationality was Leonardo da Vinci?",
    ['French', 'Spanish', 'Italian', 'German'],
    'ما جنسية ليوناردو دا فينشي؟',
    ['فرنسية', 'إسبانية', 'إيطالية', 'ألمانية'],
    2,
  ),

  kn('CU008', 'culture', [3], 10000,
    "Who wrote 'One Hundred Years of Solitude'?",
    ['Pablo Neruda', 'Jorge Luis Borges', 'Gabriel García Márquez', 'Mario Vargas Llosa'],
    "من كتب رواية 'مئة عام من العزلة'؟",
    ['بابلو نيرودا', 'خورخي لويس بورخيس', 'غابرييل غارسيا ماركيز', 'ماريو فارغاس يوسا'],
    2,
  ),

  kn('CU009', 'culture', [3], 10000,
    "Who painted 'The Persistence of Memory' (melting clocks)?",
    ['Pablo Picasso', 'Salvador Dalí', 'René Magritte', 'Marcel Duchamp'],
    "من رسم لوحة 'ثبات الذاكرة' (الساعات الذائبة)؟",
    ['بابلو بيكاسو', 'سالفادور دالي', 'رينيه ماغريت', 'مارسيل دوشامب'],
    1,
  ),

  kn('CU010', 'culture', [4], 8000,
    "In approximately what year did Leonardo da Vinci begin painting the Mona Lisa?",
    ['1483', '1503', '1524', '1545'],
    'في أي عام بدأ ليوناردو دا فينشي تقريباً رسم لوحة الموناليزا؟',
    ['١٤٨٣', '١٥٠٣', '١٥٢٤', '١٥٤٥'],
    1,
  ),

  // ── Extra diff 3 culture ──────────────────────────────────────────────────

  kn('CU011', 'culture', [3], 10000,
    "Which composer wrote 'The Magic Flute' opera?",
    ['Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Franz Schubert', 'Giuseppe Verdi'],
    "من ألّف أوبرا 'الناي السحري'؟",
    ['لودفيغ فان بيتهوفن', 'فولفغانغ أماديوس موزار', 'فرانز شوبرت', 'جوزيبي فيردي'],
    1,
  ),

  kn('CU012', 'culture', [3], 10000,
    "What architectural style is the Sagrada Família in Barcelona?",
    ['Gothic Revival', 'Art Deco', 'Catalan Modernisme', 'Baroque'],
    'ما الأسلوب المعماري لكاتدرائية ساغرادا فاميليا في برشلونة؟',
    ['القوطي التجديدي', 'أر ديكو', 'الحداثة الكتالونية', 'الباروك'],
    2,
  ),

  kn('CU013', 'culture', [3], 10000,
    "Which Shakespeare play features the line 'To be or not to be, that is the question'?",
    ['Macbeth', 'Othello', 'Hamlet', 'King Lear'],
    "في أي مسرحية لشكسبير يرد السطر 'أن تكون أو لا تكون، هذا هو السؤال'؟",
    ['ماكبث', 'عطيل', 'هاملت', 'الملك لير'],
    2,
  ),

  kn('CU014', 'culture', [3], 10000,
    "Who wrote 'Don Quixote', widely considered the first modern novel?",
    ['Lope de Vega', 'Francisco de Quevedo', 'Miguel de Cervantes', 'Tirso de Molina'],
    "من كتب 'دون كيخوته'، المعتبرة أول رواية حديثة؟",
    ['لوبي دي فيغا', 'فرانسيسكو دي كيبيدو', 'ميغيل دي ثيرفانتيس', 'تيرسو دي مولينا'],
    2,
  ),

  kn('CU015', 'culture', [3], 10000,
    "In music theory, how many semitones are in a perfect fifth interval?",
    ['5', '6', '7', '8'],
    'في نظرية الموسيقى، كم نصف نغمة في فاصل الخامسة التامة؟',
    ['٥', '٦', '٧', '٨'],
    2,
  ),

  // ── Extra diff 4 culture ──────────────────────────────────────────────────

  kn('CU016', 'culture', [4], 8000,
    "Michelangelo's 'David' statue was carved from a single block of which material?",
    ['Limestone', 'Granite', 'Carrara marble', 'Travertine'],
    "تمثال 'داود' لمايكل أنجلو نُحت من كتلة واحدة من:",
    ['الحجر الجيري', 'الغرانيت', 'رخام كارارا', 'الحجر الجيري الترافرتيني'],
    2,
  ),

  kn('CU017', 'culture', [4], 8000,
    "Which literary movement did writers like Kafka, Camus, and Sartre belong to?",
    ['Surrealism', 'Existentialism / Absurdism', 'Romanticism', 'Modernism'],
    'إلى أي تيار أدبي ينتمي الكتّاب كافكا وكامو وسارتر؟',
    ['السريالية', 'الوجودية / العبثية', 'الرومانسية', 'الحداثة'],
    1,
  ),

  kn('CU018', 'culture', [4], 8000,
    "What is the correct term for a musical composition written for eight performers?",
    ['Septet', 'Nonet', 'Octet', 'Sextet'],
    'ما المصطلح الصحيح لمقطوعة موسيقية تُعزف بثمانية أشخاص؟',
    ['سبتيت', 'نونيت', 'أوكتيت', 'سكستيت'],
    2,
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// GEOGRAPHY POOL
// ═════════════════════════════════════════════════════════════════════════════

export const GEO_POOL: KnowledgeQuestion[] = [

  kn('GE001', 'geography', [1], 15000,
    'What is the capital of France?',
    ['Lyon', 'Marseille', 'Paris', 'Nice'],
    'ما هي عاصمة فرنسا؟',
    ['ليون', 'مرسيليا', 'باريس', 'نيس'],
    2,
    'Quelle est la capitale de la France ?',
    ['Lyon', 'Marseille', 'Paris', 'Nice'],
    '¿Cuál es la capital de Francia?',
    ['Lyon', 'Marsella', 'París', 'Niza'],
  ),

  kn('GE002', 'geography', [1], 15000,
    'Which ocean is the largest?',
    ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
    'ما هو أكبر المحيطات؟',
    ['المحيط الأطلسي', 'المحيط الهندي', 'المحيط الهادئ', 'المحيط المتجمد الشمالي'],
    2,
  ),

  kn('GE003', 'geography', [1], 15000,
    'What is the longest river in the world?',
    ['Amazon', 'Mississippi', 'Nile', 'Yangtze'],
    'ما هو أطول نهر في العالم؟',
    ['الأمازون', 'المسيسيبي', 'النيل', 'نهر يانغتسي'],
    2,
  ),

  kn('GE004', 'geography', [1], 15000,
    'What is the capital of Japan?',
    ['Osaka', 'Kyoto', 'Tokyo', 'Hiroshima'],
    'ما هي عاصمة اليابان؟',
    ['أوساكا', 'كيوتو', 'طوكيو', 'هيروشيما'],
    2,
  ),

  kn('GE005', 'geography', [1], 15000,
    'On which continent is Egypt located?',
    ['Europe', 'Asia', 'Africa', 'South America'],
    'في أي قارة تقع مصر؟',
    ['أوروبا', 'آسيا', 'أفريقيا', 'أمريكا الجنوبية'],
    2,
  ),

  kn('GE006', 'geography', [2], 12000,
    'What is the smallest country in the world?',
    ['Monaco', 'San Marino', 'Liechtenstein', 'Vatican City'],
    'ما هي أصغر دولة في العالم؟',
    ['موناكو', 'سان مارينو', 'ليختنشتاين', 'الفاتيكان'],
    3,
  ),

  kn('GE007', 'geography', [2], 12000,
    'Which mountain range contains Mount Everest?',
    ['Alps', 'Andes', 'Himalayas', 'Rocky Mountains'],
    'في أي سلسلة جبلية يقع جبل إيفرست؟',
    ['جبال الألب', 'جبال الأنديز', 'جبال الهيمالايا', 'جبال روكي'],
    2,
  ),

  kn('GE008', 'geography', [2], 12000,
    'What is the capital of Australia?',
    ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    'ما هي عاصمة أستراليا؟',
    ['سيدني', 'ملبورن', 'كانبيرا', 'بريزبين'],
    2,
  ),

  kn('GE009', 'geography', [2], 12000,
    'Which country is the largest in the world by land area?',
    ['China', 'United States', 'Canada', 'Russia'],
    'أي دولة هي الأكبر مساحةً في العالم؟',
    ['الصين', 'الولايات المتحدة', 'كندا', 'روسيا'],
    3,
  ),

  kn('GE010', 'geography', [3], 10000,
    'Which country has the most time zones in the world?',
    ['Russia', 'United States', 'China', 'France'],
    'أي دولة لديها أكثر عدد من المناطق الزمنية في العالم؟',
    ['روسيا', 'الولايات المتحدة', 'الصين', 'فرنسا'],
    3,
  ),

  kn('GE011', 'geography', [3], 10000,
    'What is the name of the world\'s deepest lake?',
    ['Lake Superior', 'Caspian Sea', 'Lake Tanganyika', 'Lake Baikal'],
    'ما اسم أعمق بحيرة في العالم؟',
    ['بحيرة سوبيريور', 'بحر قزوين', 'بحيرة تنغانيقا', 'بحيرة بايكال'],
    3,
  ),

  kn('GE012', 'geography', [4], 8000,
    'How many countries share a land border with China?',
    ['12', '13', '14', '15'],
    'كم دولة تشترك في حدود برية مع الصين؟',
    ['١٢', '١٣', '١٤', '١٥'],
    2,
  ),

  // ── Extra diff 3 geography ────────────────────────────────────────────────

  kn('GE013', 'geography', [3], 10000,
    'Which country contains the most of the Amazon rainforest?',
    ['Peru', 'Colombia', 'Brazil', 'Venezuela'],
    'أي دولة تحتوي على أكبر جزء من غابات الأمازون المطيرة؟',
    ['بيرو', 'كولومبيا', 'البرازيل', 'فنزويلا'],
    2,
  ),

  kn('GE014', 'geography', [3], 10000,
    'What is the name of the strait that separates Europe from Africa?',
    ['Strait of Hormuz', 'Strait of Gibraltar', 'Strait of Messina', 'Bosphorus'],
    'ما اسم المضيق الذي يفصل أوروبا عن أفريقيا؟',
    ['مضيق هرمز', 'مضيق جبل طارق', 'مضيق مسينا', 'مضيق البوسفور'],
    1,
  ),

  kn('GE015', 'geography', [3], 10000,
    'Which African country has the largest area?',
    ['Sudan', 'Democratic Republic of Congo', 'Algeria', 'Libya'],
    'أي الدول الأفريقية تمتلك أكبر مساحة؟',
    ['السودان', 'الكونغو الديمقراطية', 'الجزائر', 'ليبيا'],
    2,
  ),

  kn('GE016', 'geography', [3], 10000,
    "Which country is home to both the world's highest lake (Titicaca) and the world's highest capital city?",
    ['Peru', 'Bolivia', 'Ecuador', 'Chile'],
    'أي دولة تضم كلاً من أعلى بحيرة (تيتيكاكا) وأعلى عاصمة في العالم؟',
    ['بيرو', 'بوليفيا', 'الإكوادور', 'تشيلي'],
    1,
  ),

  kn('GE017', 'geography', [3], 10000,
    'The island of Borneo is divided between which THREE countries?',
    ['Indonesia, Malaysia, Philippines', 'Indonesia, Malaysia, Brunei', 'Malaysia, Brunei, Thailand', 'Indonesia, Brunei, Singapore'],
    'جزيرة بورنيو مقسّمة بين ثلاث دول هي:',
    ['إندونيسيا، ماليزيا، الفلبين', 'إندونيسيا، ماليزيا، بروناي', 'ماليزيا، بروناي، تايلاند', 'إندونيسيا، بروناي، سنغافورة'],
    1,
  ),

  // ── Extra diff 4 geography ────────────────────────────────────────────────

  kn('GE018', 'geography', [4], 8000,
    'Which country has the longest coastline in the world?',
    ['Norway', 'Russia', 'Canada', 'Indonesia'],
    'أي دولة تمتلك أطول ساحل بحري في العالم؟',
    ['النرويج', 'روسيا', 'كندا', 'إندونيسيا'],
    2,
  ),

  kn('GE019', 'geography', [4], 8000,
    'The Coriolis effect causes cyclones to rotate in WHICH direction in the Southern Hemisphere?',
    ['Counterclockwise (same as North)', 'Clockwise', 'They do not rotate', 'Varies by latitude'],
    'بسبب تأثير كوريوليس، في أي اتجاه تدور الأعاصير في نصف الكرة الجنوبي؟',
    ['عكس عقارب الساعة (مثل الشمال)', 'مع عقارب الساعة', 'لا تدور', 'يتفاوت حسب خط العرض'],
    1,
  ),

  kn('GE020', 'geography', [4], 8000,
    'What percentage of the Earth\'s fresh water is stored in Antarctica\'s ice sheets (approximately)?',
    ['40%', '55%', '70%', '85%'],
    'ما نسبة المياه العذبة على الأرض المخزّنة في الجليد القطبي الجنوبي تقريباً؟',
    ['٤٠٪', '٥٥٪', '٧٠٪', '٨٥٪'],
    2,
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// HISTORY POOL
// ═════════════════════════════════════════════════════════════════════════════

export const HISTORY_POOL: KnowledgeQuestion[] = [

  kn('HI001', 'history', [1], 15000,
    'In what year did World War II end?',
    ['1943', '1944', '1945', '1946'],
    'في أي عام انتهت الحرب العالمية الثانية؟',
    ['١٩٤٣', '١٩٤٤', '١٩٤٥', '١٩٤٦'],
    2,
    'En quelle année la Seconde Guerre mondiale a-t-elle pris fin ?',
    ['1943', '1944', '1945', '1946'],
  ),

  kn('HI002', 'history', [1], 15000,
    'Who was the first person to walk on the moon?',
    ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'],
    'من كان أول إنسان يمشي على سطح القمر؟',
    ['باز ألدرين', 'نيل أرمسترونج', 'يوري غاغارين', 'جون غلين'],
    1,
  ),

  kn('HI003', 'history', [1], 15000,
    'In what year did the Berlin Wall fall?',
    ['1985', '1987', '1989', '1991'],
    'في أي عام سقط جدار برلين؟',
    ['١٩٨٥', '١٩٨٧', '١٩٨٩', '١٩٩١'],
    2,
  ),

  kn('HI004', 'history', [1], 15000,
    'Who was the first President of the United States?',
    ['Thomas Jefferson', 'George Washington', 'Abraham Lincoln', 'John Adams'],
    'من كان أول رئيس للولايات المتحدة؟',
    ['توماس جيفرسون', 'جورج واشنطن', 'أبراهام لينكولن', 'جون آدامز'],
    1,
  ),

  kn('HI005', 'history', [2], 12000,
    'In what year did Christopher Columbus first arrive in the Americas?',
    ['1488', '1490', '1492', '1498'],
    'في أي عام وصل كريستوفر كولومبوس لأول مرة إلى أمريكا؟',
    ['١٤٨٨', '١٤٩٠', '١٤٩٢', '١٤٩٨'],
    2,
  ),

  kn('HI006', 'history', [2], 12000,
    'Which ancient Egyptian queen was known for allying with Julius Caesar and Mark Antony?',
    ['Nefertiti', 'Cleopatra', 'Hatshepsut', 'Nefertari'],
    'أي ملكة مصرية قديمة اشتُهرت بتحالفها مع يوليوس قيصر ومارك أنطوني؟',
    ['نفرتيتي', 'كليوباترا', 'حتشبسوت', 'نفرتاري'],
    1,
  ),

  kn('HI007', 'history', [2], 12000,
    'What year did the French Revolution begin?',
    ['1776', '1783', '1789', '1799'],
    'في أي عام اندلعت الثورة الفرنسية؟',
    ['١٧٧٦', '١٧٨٣', '١٧٨٩', '١٧٩٩'],
    2,
    'En quelle année a débuté la Révolution française ?',
    ['1776', '1783', '1789', '1799'],
  ),

  kn('HI008', 'history', [2], 12000,
    'Who is credited with inventing the telephone?',
    ['Thomas Edison', 'Nikola Tesla', 'Alexander Graham Bell', 'Guglielmo Marconi'],
    'من يُنسب إليه اختراع الهاتف؟',
    ['توماس إديسون', 'نيكولا تيسلا', 'ألكسندر غراهام بيل', 'غوليلمو ماركوني'],
    2,
  ),

  kn('HI009', 'history', [3], 10000,
    'In what year did the Titanic sink?',
    ['1908', '1910', '1912', '1914'],
    'في أي عام غرقت سفينة تيتانيك؟',
    ['١٩٠٨', '١٩١٠', '١٩١٢', '١٩١٤'],
    2,
  ),

  kn('HI010', 'history', [3], 10000,
    'Who was the leader of the Soviet Union during World War II?',
    ['Vladimir Lenin', 'Leon Trotsky', 'Nikita Khrushchev', 'Joseph Stalin'],
    'من كان زعيم الاتحاد السوفيتي خلال الحرب العالمية الثانية؟',
    ['فلاديمير لينين', 'ليون تروتسكي', 'نيكيتا خروتشوف', 'جوزيف ستالين'],
    3,
  ),

  kn('HI011', 'history', [3], 10000,
    'What was the German war plan for the invasion of France through Belgium in WWI?',
    ['Barbarossa Plan', 'Schlieffen Plan', 'Blitzkrieg Plan', 'Operation Overlord'],
    'ما هو اسم الخطة الحربية الألمانية لغزو فرنسا عبر بلجيكا في الحرب العالمية الأولى؟',
    ['خطة بارباروسا', 'خطة شليفن', 'خطة الحرب الخاطفة', 'عملية أوفرلورد'],
    1,
  ),

  kn('HI012', 'history', [4], 8000,
    'In what year was the Magna Carta signed?',
    ['1199', '1209', '1215', '1225'],
    'في أي عام وُقِّعت وثيقة الماغنا كارتا؟',
    ['١١٩٩', '١٢٠٩', '١٢١٥', '١٢٢٥'],
    2,
  ),

  kn('HI013', 'history', [4], 8000,
    'Who was the last Byzantine Emperor when Constantinople fell in 1453?',
    ['Basil II', 'Constantine IX', 'Constantine XI Palaiologos', 'John VIII Palaiologos'],
    'من كان آخر أباطرة بيزنطة عند سقوط القسطنطينية عام 1453؟',
    ['باسيل الثاني', 'قسطنطين التاسع', 'قسطنطين الحادي عشر باليولوغوس', 'يوحنا الثامن باليولوغوس'],
    2,
  ),

  // ── Extra diff 3 history ──────────────────────────────────────────────────

  kn('HI014', 'history', [3], 10000,
    'The Peloponnesian War (431–404 BC) was fought mainly between which two city-states?',
    ['Athens and Sparta', 'Rome and Carthage', 'Corinth and Thebes', 'Macedonia and Persia'],
    'خاضت حرب البيلوبونيز (431-404 ق.م) أساساً بين أي مدينتين-دولتين؟',
    ['أثينا وإسبرطة', 'روما وقرطاجة', 'كورنثوس وطيبة', 'مقدونيا وفارس'],
    0,
  ),

  kn('HI015', 'history', [3], 10000,
    'Which treaty ended the Thirty Years War in 1648?',
    ['Treaty of Utrecht', 'Peace of Westphalia', 'Treaty of Paris', 'Congress of Vienna'],
    'أي معاهدة أنهت حرب الثلاثين عاماً عام 1648؟',
    ['معاهدة أوترخت', 'صلح وستفاليا', 'معاهدة باريس', 'مؤتمر فيينا'],
    1,
  ),

  kn('HI016', 'history', [3], 10000,
    'The Battle of Hastings in 1066 was fought between William the Conqueror and which English king?',
    ['Edward the Confessor', 'Harold Godwinson', 'Æthelred the Unready', 'Cnut the Great'],
    'دارت معركة هاستينغز عام 1066 بين وليم الفاتح وأي ملك إنجليزي؟',
    ['إدوارد المعترف', 'هارولد غودوينسون', 'إثيلريد غير المستعد', 'كانوت الأكبر'],
    1,
  ),

  // ── Extra diff 4 history ──────────────────────────────────────────────────

  kn('HI017', 'history', [4], 8000,
    'The Defenestration of Prague (1618) is considered the direct trigger for which war?',
    ['Seven Years War', 'Thirty Years War', 'War of Spanish Succession', 'Napoleonic Wars'],
    'تُعدّ حادثة الإلقاء من نافذة براغ (1618) المحرّك المباشر لأي حرب؟',
    ['حرب السبع سنوات', 'حرب الثلاثين عاماً', 'حرب الخلافة الإسبانية', 'الحروب النابليونية'],
    1,
  ),

  kn('HI018', 'history', [4], 8000,
    'Which pharaoh built the Great Pyramid of Giza?',
    ['Ramesses II', 'Tutankhamun', 'Khufu (Cheops)', 'Thutmose III'],
    'أي فرعون بنى الهرم الأكبر في الجيزة؟',
    ['رمسيس الثاني', 'توت عنخ آمون', 'خوفو (شيوبس)', 'تحتمس الثالث'],
    2,
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// PHILOSOPHY / FIGURES POOL
// ═════════════════════════════════════════════════════════════════════════════

export const PHILO_POOL: KnowledgeQuestion[] = [

  kn('PH001', 'philosophy', [1], 15000,
    "Who wrote 'The Republic'?",
    ['Socrates', 'Aristotle', 'Plato', 'Epicurus'],
    "من كتب كتاب 'الجمهورية'؟",
    ['سقراط', 'أرسطو', 'أفلاطون', 'إيبيقور'],
    2,
  ),

  kn('PH002', 'philosophy', [1], 15000,
    "Which philosopher said 'I think, therefore I am'?",
    ['Immanuel Kant', 'René Descartes', 'John Locke', 'David Hume'],
    "أي فيلسوف قال 'أنا أفكر إذن أنا موجود'؟",
    ['إيمانويل كانط', 'رينيه ديكارت', 'جون لوك', 'ديفيد هيوم'],
    1,
  ),

  kn('PH003', 'philosophy', [1], 15000,
    "Who was Plato's most famous student?",
    ['Socrates', 'Aristotle', 'Epicurus', 'Pythagoras'],
    'من كان أشهر طلاب أفلاطون؟',
    ['سقراط', 'أرسطو', 'إيبيقور', 'فيثاغورس'],
    1,
  ),

  kn('PH004', 'philosophy', [2], 12000,
    'Which ancient philosopher taught at the Lyceum in Athens?',
    ['Plato', 'Aristotle', 'Socrates', 'Democritus'],
    'أي فيلسوف قديم كان يعلّم في مدرسة الليسيوم بأثينا؟',
    ['أفلاطون', 'أرسطو', 'سقراط', 'ديمقريطس'],
    1,
  ),

  kn('PH005', 'philosophy', [2], 12000,
    "Who wrote 'The Prince', a treatise on political power?",
    ['Thomas Hobbes', 'John Locke', 'Niccolò Machiavelli', 'Jean-Jacques Rousseau'],
    "من كتب 'الأمير'، الرسالة الشهيرة عن السلطة السياسية؟",
    ['توماس هوبز', 'جون لوك', 'نيقولا مكيافيلي', 'جان جاك روسو'],
    2,
  ),

  kn('PH006', 'philosophy', [3], 10000,
    "Which philosopher coined the concept of 'Übermensch' (Superman)?",
    ['Arthur Schopenhauer', 'Friedrich Nietzsche', 'Martin Heidegger', 'Søren Kierkegaard'],
    "أي فيلسوف صاغ مفهوم 'الإنسان الأعلى' (Übermensch)؟",
    ['آرثر شوبنهاور', 'فريدريك نيتشه', 'مارتن هايدغر', 'سورن كيركيغارد'],
    1,
  ),

  kn('PH007', 'philosophy', [3], 10000,
    "Who wrote 'Critique of Pure Reason'?",
    ['Georg Hegel', 'Immanuel Kant', 'Johann Fichte', 'Friedrich Schelling'],
    "من كتب 'نقد العقل الخالص'؟",
    ['غيورغ هيغل', 'إيمانويل كانط', 'يوهان فيشته', 'فريدريك شيلينغ'],
    1,
  ),

  kn('PH008', 'philosophy', [4], 8000,
    "Who wrote 'Being and Time' (Sein und Zeit)?",
    ['Edmund Husserl', 'Martin Heidegger', 'Hans-Georg Gadamer', 'Maurice Merleau-Ponty'],
    "من كتب 'الوجود والزمان' (Sein und Zeit)؟",
    ['إدموند هوسرل', 'مارتن هايدغر', 'هانس غيورغ غادامر', 'موريس مرلو-بونتي'],
    1,
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// RELIGIOUS KNOWLEDGE POOL (factual knowledge only)
// ═════════════════════════════════════════════════════════════════════════════

export const RELIGION_POOL: KnowledgeQuestion[] = [

  kn('RE001', 'religious', [1], 15000,
    'What is the holy book of Islam?',
    ['Torah', 'Bible', 'Quran', 'Vedas'],
    'ما هو الكتاب المقدس في الإسلام؟',
    ['التوراة', 'الإنجيل', 'القرآن الكريم', 'الفيدا'],
    2,
  ),

  kn('RE002', 'religious', [1], 15000,
    'How many books are in the Protestant Christian Bible?',
    ['56', '60', '66', '73'],
    'كم عدد كتب الكتاب المقدس البروتستانتي؟',
    ['٥٦', '٦٠', '٦٦', '٧٣'],
    2,
  ),

  kn('RE003', 'religious', [1], 15000,
    'In which city was the Prophet Muhammad ﷺ born?',
    ['Medina', 'Jerusalem', 'Mecca', 'Taif'],
    'في أي مدينة وُلد النبي محمد ﷺ؟',
    ['المدينة المنورة', 'القدس', 'مكة المكرمة', 'الطائف'],
    2,
  ),

  kn('RE004', 'religious', [2], 12000,
    'What is the holiest city in Judaism?',
    ['Tel Aviv', 'Jerusalem', 'Nazareth', 'Bethlehem'],
    'ما هي أقدس مدينة في الديانة اليهودية؟',
    ['تل أبيب', 'القدس', 'الناصرة', 'بيت لحم'],
    1,
  ),

  kn('RE005', 'religious', [2], 12000,
    'From what year (CE) does the Islamic Hijri calendar begin?',
    ['570 CE', '610 CE', '622 CE', '632 CE'],
    'من أي سنة ميلادية يبدأ التقويم الهجري الإسلامي؟',
    ['٥٧٠م', '٦١٠م', '٦٢٢م', '٦٣٢م'],
    2,
  ),

  kn('RE006', 'religious', [2], 12000,
    'Which of the following is NOT one of the Five Pillars of Islam?',
    ['Zakat (Almsgiving)', 'Hajj (Pilgrimage)', 'Jihad (Struggle)', 'Sawm (Fasting)'],
    'أيٌّ من التالي ليس ركناً من أركان الإسلام الخمسة؟',
    ['الزكاة', 'الحج', 'الجهاد', 'الصوم'],
    2,
  ),

  kn('RE007', 'religious', [3], 10000,
    'What is the name of the Hindu god associated with preservation?',
    ['Brahma', 'Vishnu', 'Shiva', 'Ganesha'],
    'ما هو اسم الإله الهندوسي المرتبط بالحفاظ على الكون؟',
    ['براهما', 'فيشنو', 'شيفا', 'غانيشا'],
    1,
  ),

  kn('RE008', 'religious', [3], 10000,
    'In what language were most New Testament books originally written?',
    ['Latin', 'Aramaic', 'Hebrew', 'Greek'],
    'بأي لغة كُتبت معظم كتب العهد الجديد أصلاً؟',
    ['اللاتينية', 'الآرامية', 'العبرية', 'اليونانية'],
    3,
  ),

  kn('RE009', 'religious', [4], 8000,
    'What is the name of the night journey of the Prophet Muhammad ﷺ from Mecca to Jerusalem?',
    ['Al-Miraj', 'Al-Isra', 'Al-Hijra', 'Al-Fath'],
    'ما اسم رحلة النبي محمد ﷺ الليلية من مكة إلى القدس؟',
    ['المعراج', 'الإسراء', 'الهجرة', 'الفتح'],
    1,
  ),

  kn('RE010', 'religious', [4], 8000,
    'How many surahs (chapters) are there in the Quran?',
    ['99', '110', '114', '120'],
    'كم عدد سور القرآن الكريم؟',
    ['٩٩', '١١٠', '١١٤', '١٢٠'],
    2,
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// FAMOUS PEOPLE POOL
// Covers: Scientists · Inventors · Artists · Leaders · Athletes · Explorers
// ═════════════════════════════════════════════════════════════════════════════

export const FAMOUS_POOL: KnowledgeQuestion[] = [

  // ── Division III (difficulty 1) — widely known figures ────────────────────

  kn('FP001', 'famous_people', [1], 15000,
    'Who painted the Mona Lisa?',
    ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Caravaggio'],
    'من رسم لوحة الموناليزا؟',
    ['مايكل أنجلو', 'رافائيل', 'ليوناردو دا فينشي', 'كارافاجيو'],
    2,
  ),

  kn('FP002', 'famous_people', [1], 15000,
    'Who invented the telephone?',
    ['Thomas Edison', 'Nikola Tesla', 'Alexander Graham Bell', 'Guglielmo Marconi'],
    'من اخترع الهاتف؟',
    ['توماس إديسون', 'نيكولا تسلا', 'ألكسندر غراهام بيل', 'غوليلمو ماركوني'],
    2,
  ),

  kn('FP003', 'famous_people', [1], 15000,
    'Who wrote "Romeo and Juliet"?',
    ['Charles Dickens', 'William Shakespeare', 'Homer', 'Mark Twain'],
    'من كتب "روميو وجولييت"؟',
    ['تشارلز ديكنز', 'ويليام شكسبير', 'هوميروس', 'مارك توين'],
    1,
  ),

  kn('FP004', 'famous_people', [1], 15000,
    'Who was the first human to walk on the Moon?',
    ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'John Glenn'],
    'من كان أول إنسان يمشي على القمر؟',
    ['باز ألدرين', 'يوري غاغارين', 'نيل أرمسترونغ', 'جون غلين'],
    2,
  ),

  kn('FP005', 'famous_people', [1], 15000,
    'Which scientist developed the theory of relativity?',
    ['Isaac Newton', 'Albert Einstein', 'Galileo Galilei', 'Niels Bohr'],
    'أي عالم طوّر نظرية النسبية؟',
    ['إسحاق نيوتن', 'ألبرت أينشتاين', 'غاليليو غاليلي', 'نيلز بور'],
    1,
  ),

  kn('FP006', 'famous_people', [1], 15000,
    'Who founded Microsoft?',
    ['Steve Jobs', 'Elon Musk', 'Mark Zuckerberg', 'Bill Gates'],
    'من أسّس شركة مايكروسوفت؟',
    ['ستيف جوبز', 'إيلون ماسك', 'مارك زوكربيرغ', 'بيل غيتس'],
    3,
  ),

  kn('FP007', 'famous_people', [1], 15000,
    'Who was the first President of the United States?',
    ['Abraham Lincoln', 'Thomas Jefferson', 'George Washington', 'John Adams'],
    'من كان أول رئيس للولايات المتحدة الأمريكية؟',
    ['أبراهام لينكولن', 'توماس جيفرسون', 'جورج واشنطن', 'جون آدامز'],
    2,
  ),

  // ── Division II (difficulty 2) — notable figures ──────────────────────────

  kn('FP008', 'famous_people', [2], 18000,
    'Who was the first woman to win a Nobel Prize?',
    ['Rosalind Franklin', 'Ada Lovelace', 'Marie Curie', 'Florence Nightingale'],
    'من كانت أول امرأة تفوز بجائزة نوبل؟',
    ['روزاليند فرانكلين', 'آدا لوفليس', 'ماري كوري', 'فلورنس نايتينغيل'],
    2,
  ),

  kn('FP009', 'famous_people', [2], 18000,
    'Who discovered penicillin?',
    ['Louis Pasteur', 'Robert Koch', 'Alexander Fleming', 'Joseph Lister'],
    'من اكتشف البنسلين؟',
    ['لويس باستور', 'روبرت كوخ', 'ألكسندر فليمنغ', 'جوزيف ليستر'],
    2,
  ),

  kn('FP010', 'famous_people', [2], 18000,
    'Who painted the ceiling of the Sistine Chapel?',
    ['Leonardo da Vinci', 'Raphael', 'Donatello', 'Michelangelo'],
    'من رسم سقف كنيسة سيستين؟',
    ['ليوناردو دا فينشي', 'رافائيل', 'دوناتيلو', 'مايكل أنجلو'],
    3,
  ),

  kn('FP011', 'famous_people', [2], 18000,
    'Who wrote "The Art of War"?',
    ['Confucius', 'Lao Tzu', 'Sun Tzu', 'Mencius'],
    'من كتب "فن الحرب"؟',
    ['كونفوشيوس', 'لاو تسو', 'سون تسو', 'مينسيوس'],
    2,
  ),

  kn('FP012', 'famous_people', [2], 18000,
    'Who was the first woman to fly solo across the Atlantic Ocean?',
    ['Bessie Coleman', 'Jacqueline Cochran', 'Amelia Earhart', 'Harriet Quimby'],
    'من كانت أول امرأة تطير منفردةً عبر المحيط الأطلسي؟',
    ['بيسي كولمان', 'جاكلين كوكران', 'أميليا إيرهارت', 'هارييت كويمبي'],
    2,
  ),

  kn('FP013', 'famous_people', [2], 18000,
    'Which scientist proposed the theory of natural selection?',
    ['Gregor Mendel', 'Jean-Baptiste Lamarck', 'Alfred Wallace', 'Charles Darwin'],
    'أي عالم اقترح نظرية الانتقاء الطبيعي؟',
    ['غريغور مندل', 'جان باتيست لامارك', 'ألفريد والاس', 'تشارلز داروين'],
    3,
  ),

  kn('FP014', 'famous_people', [2], 18000,
    'Who invented the printing press with movable type?',
    ['Leonardo da Vinci', 'Galileo Galilei', 'Johannes Gutenberg', 'Francis Bacon'],
    'من اخترع المطبعة بالحروف المتحركة؟',
    ['ليوناردو دا فينشي', 'غاليليو غاليلي', 'يوهانس غوتنبرغ', 'فرانسيس بيكون'],
    2,
  ),

  // ── Professional (difficulty 3) — deeper knowledge ────────────────────────

  kn('FP015', 'famous_people', [3], 20000,
    'Who invented the World Wide Web?',
    ['Vint Cerf', 'Steve Jobs', 'Tim Berners-Lee', 'Dennis Ritchie'],
    'من اخترع الشبكة العنكبوتية (WWW)؟',
    ['فينت سيرف', 'ستيف جوبز', 'تيم بيرنرز-لي', 'دينيس ريتشي'],
    2,
  ),

  kn('FP016', 'famous_people', [3], 20000,
    'Who was the first person to reach the South Pole?',
    ['Ernest Shackleton', 'Robert Falcon Scott', 'Roald Amundsen', 'Richard Byrd'],
    'من كان أول شخص يصل إلى القطب الجنوبي؟',
    ['إرنست شاكلتون', 'روبرت فالكون سكوت', 'رولد أموندسن', 'ريتشارد بيرد'],
    2,
  ),

  kn('FP017', 'famous_people', [3], 20000,
    'Who discovered the structure of DNA alongside Crick?',
    ['Linus Pauling', 'Rosalind Franklin', 'James Watson', 'Erwin Schrödinger'],
    'من اكتشف بنية DNA إلى جانب كريك؟',
    ['لينوس بولينغ', 'روزاليند فرانكلين', 'جيمس واتسون', 'إيرفين شرودنغر'],
    2,
  ),

  kn('FP018', 'famous_people', [3], 20000,
    'Who was the first human to orbit Earth?',
    ['Alan Shepard', 'John Glenn', 'Valentina Tereshkova', 'Yuri Gagarin'],
    'من كان أول إنسان يدور حول الأرض؟',
    ['آلان شيبارد', 'جون غلين', 'فالنتينا تيريشكوفا', 'يوري غاغارين'],
    3,
  ),

  kn('FP019', 'famous_people', [3], 20000,
    'Who wrote "The Prince" (Il Principe)?',
    ['Thomas Hobbes', 'Jean-Jacques Rousseau', 'John Locke', 'Niccolò Machiavelli'],
    'من كتب كتاب "الأمير" (Il Principe)؟',
    ['توماس هوبز', 'جان جاك روسو', 'جون لوك', 'نيكولو مكيافيلي'],
    3,
  ),

  kn('FP020', 'famous_people', [3], 20000,
    'Who discovered X-rays in 1895?',
    ['Henri Becquerel', 'Pierre Curie', 'Wilhelm Röntgen', 'J.J. Thomson'],
    'من اكتشف الأشعة السينية عام 1895؟',
    ['هنري بيكريل', 'بيير كوري', 'فيلهلم رونتغن', 'ج.ج. طومسون'],
    2,
  ),

  // ── Champions (difficulty 4) — expert-level ───────────────────────────────

  kn('FP021', 'famous_people', [4], 22000,
    'Who developed the first programmable electromechanical computer (Z3) in 1941?',
    ['Alan Turing', 'John von Neumann', 'Konrad Zuse', 'Charles Babbage'],
    'من طوّر أول حاسوب كهروميكانيكي قابل للبرمجة (Z3) عام 1941؟',
    ['آلان تورينغ', 'جون فون نيومان', 'كونراد تسوزه', 'تشارلز بابيج'],
    2,
  ),

  kn('FP022', 'famous_people', [4], 22000,
    'Who coined the term "radioactivity"?',
    ['Ernest Rutherford', 'Marie Curie', 'Henri Becquerel', 'Pierre Curie'],
    'من ابتكر مصطلح "النشاط الإشعاعي"؟',
    ['إرنست رذرفورد', 'ماري كوري', 'هنري بيكريل', 'بيير كوري'],
    1,
  ),

  kn('FP023', 'famous_people', [4], 22000,
    'Who was the first female Prime Minister of the United Kingdom?',
    ['Theresa May', 'Margaret Thatcher', 'Angela Merkel', 'Jacinda Ardern'],
    'من كانت أول امرأة تتولى منصب رئيسة وزراء المملكة المتحدة؟',
    ['تيريزا ماي', 'مارغريت ثاتشر', 'أنجيلا ميركل', 'جاسيندا أرديرن'],
    1,
  ),

  kn('FP024', 'famous_people', [4], 22000,
    'Who formulated the laws of planetary motion in the early 17th century?',
    ['Galileo Galilei', 'Isaac Newton', 'Tycho Brahe', 'Johannes Kepler'],
    'من صاغ قوانين الحركة الكوكبية في مطلع القرن السابع عشر؟',
    ['غاليليو غاليلي', 'إسحاق نيوتن', 'تايكو براهي', 'يوهانس كيبلر'],
    3,
  ),

  kn('FP025', 'famous_people', [4], 22000,
    'Who proved Fermat\'s Last Theorem in 1995 after 358 years?',
    ['Grigori Perelman', 'Terence Tao', 'Paul Erdős', 'Andrew Wiles'],
    'من أثبت نظرية فيرما الأخيرة عام 1995 بعد 358 عاماً؟',
    ['غريغوري بيرلمان', 'تيرنس تاو', 'بول إيرديش', 'أندرو وايلز'],
    3,
  ),

];

// ═════════════════════════════════════════════════════════════════════════════
// VISUAL ATTENTION POOL
// Goal: test reading accuracy and attention.
// Most questions ask for something DIFFERENT than what is displayed.
// Categories: Fruits · Animals · Vehicles · Tools · Flags · Technology ·
//             Sports items · Everyday objects · Counting challenges
// ═════════════════════════════════════════════════════════════════════════════

export const VA_POOL: VisualAttentionQuestion[] = [

  // ── Fruits ────────────────────────────────────────────────────────────────

  // Show green apple, ask for orange (trap: instinct = click green apple)
  va('VA001', [1], 8000, '🍏',
    ['🍌', '🍊', '🍏', '🍐'],
    'Choose the ORANGE',
    'اختر البرتقالة',
    1,
  ),

  va('VA002', [1], 8000, '🍇',
    ['🍋', '🍌', '🍇', '🍑'],
    'Find the BANANA',
    'ابحث عن الموزة',
    1,
  ),

  va('VA003', [1], 8000, '🍊',
    ['🍊', '🍋', '🍌', '🍉'],
    'Select the LEMON',
    'اختر الليمونة',
    1,
  ),

  va('VA004', [1], 8000, '🍓',
    ['🍓', '🍇', '🍒', '🫐'],
    'Pick the GRAPES',
    'اختر العنب',
    1,
  ),

  va('VA005', [1, 2], 8000, '🍑',
    ['🍑', '🍒', '🍓', '🥭'],
    'Choose the STRAWBERRY',
    'اختر الفراولة',
    2,
  ),

  // ── Animals ───────────────────────────────────────────────────────────────

  va('VA006', [1], 8000, '🐶',
    ['🐶', '🐱', '🦊', '🐸'],
    'Select the CAT',
    'اختر القطة',
    1,
  ),

  va('VA007', [1, 2], 8000, '🦁',
    ['🐯', '🦁', '🐻', '🦊'],
    'Find the BEAR',
    'ابحث عن الدب',
    2,
  ),

  va('VA008', [2], 8000, '🐸',
    ['🐸', '🐇', '🐿️', '🦔'],
    'Pick the RABBIT',
    'اختر الأرنب',
    1,
  ),

  va('VA009', [2], 8000, '🐋',
    ['🦈', '🐳', '🐬', '🐋'],
    'Choose the DOLPHIN',
    'اختر الدلفين',
    2,
  ),

  va('VA010', [2, 3], 8000, '🦅',
    ['🦅', '🦉', '🦚', '🦜'],
    'Select the OWL',
    'اختر البومة',
    1,
  ),

  // ── Vehicles ─────────────────────────────────────────────────────────────

  va('VA011', [1], 8000, '🚗',
    ['🚗', '✈️', '🚢', '🚂'],
    'Pick the AIRPLANE',
    'اختر الطائرة',
    1,
  ),

  va('VA012', [2], 7000, '🚂',
    ['🚁', '🚂', '✈️', '🚀'],
    'Choose the HELICOPTER',
    'اختر الطائرة المروحية',
    0,
  ),

  va('VA013', [2], 7000, '✈️',
    ['🛸', '✈️', '🚀', '🚁'],
    'Find the ROCKET',
    'ابحث عن الصاروخ',
    2,
  ),

  // ── Tools ─────────────────────────────────────────────────────────────────

  va('VA014', [1], 8000, '🔨',
    ['🔨', '✂️', '🪛', '🔧'],
    'Select the SCISSORS',
    'اختر المقص',
    1,
  ),

  va('VA015', [2], 7000, '🪛',
    ['🔧', '🪛', '🔨', '⚙️'],
    'Choose the WRENCH',
    'اختر المفتاح الإنجليزي',
    0,
  ),

  // ── Flags (harder — tests flag recognition) ───────────────────────────────

  va('VA016', [2], 8000, '🇫🇷',
    ['🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸'],
    'Choose the GERMAN flag',
    'اختر العلم الألماني',
    1,
  ),

  va('VA017', [3], 7000, '🇧🇷',
    ['🇧🇷', '🇺🇾', '🇦🇷', '🇨🇱'],
    'Find the ARGENTINA flag',
    'ابحث عن علم الأرجنتين',
    2,
  ),

  va('VA018', [3], 7000, '🇯🇵',
    ['🇨🇳', '🇯🇵', '🇰🇷', '🇻🇳'],
    'Select the CHINA flag',
    'اختر العلم الصيني',
    0,
  ),

  // ── Technology ────────────────────────────────────────────────────────────

  va('VA019', [1, 2], 8000, '📱',
    ['📱', '💻', '🖥️', '⌨️'],
    'Choose the LAPTOP',
    'اختر الحاسوب المحمول',
    1,
  ),

  va('VA020', [2], 7000, '💻',
    ['🖥️', '💻', '🖨️', '📷'],
    'Find the PRINTER',
    'ابحث عن الطابعة',
    2,
  ),

  // ── Sports items ──────────────────────────────────────────────────────────

  va('VA021', [1], 8000, '⚽',
    ['⚽', '🏀', '🎾', '🏈'],
    'Pick the BASKETBALL',
    'اختر كرة السلة',
    1,
  ),

  va('VA022', [1, 2], 8000, '🏀',
    ['🎾', '🏀', '⚾', '🏐'],
    'Select the TENNIS BALL',
    'اختر كرة التنس',
    0,
  ),

  va('VA023', [2], 7000, '🎾',
    ['⚽', '🏈', '🎾', '🏐'],
    'Choose the FOOTBALL (soccer ball)',
    'اختر كرة القدم',
    0,
  ),

  // ── Counting challenges (attention + deception) ───────────────────────────
  // Show a group of emojis, count a specific one (not the majority)

  va('VA024', [3], 9000, '🍊🍊🍊🍏🍊',
    ['3', '4', '5', '6'],
    'Count the 🍊 ORANGES only (the green apple is NOT an orange)',
    'عدّ البرتقالات 🍊 فقط (التفاحة الخضراء ليست برتقالة)',
    1,  // 4 oranges
  ),

  va('VA025', [3, 4], 9000, '🐶🐶🐱🐶🐶',
    ['0', '1', '2', '3'],
    'How many CATS are shown?',
    'كم قطة مُعروضة؟',
    1,  // 1 cat
  ),

  // ── Buildings ─────────────────────────────────────────────────────────────

  va('VA026', [1], 8000, '🏰',
    ['🏰', '🕌', '⛪', '🛕'],
    'Select the MOSQUE',
    'اختر المسجد',
    1,
  ),

  va('VA027', [1, 2], 8000, '🏗️',
    ['🏠', '🏗️', '🏢', '🏛️'],
    'Find the HOUSE',
    'ابحث عن المنزل',
    0,
  ),

  va('VA028', [2], 7000, '🏛️',
    ['🏢', '🏬', '🏛️', '🏰'],
    'Choose the OFFICE BUILDING',
    'اختر مبنى المكاتب',
    0,
  ),

  va('VA029', [2], 7000, '⛪',
    ['🕌', '🛕', '⛩️', '⛪'],
    'Pick the SHINTO SHRINE (Japanese torii gate)',
    'اختر الضريح الشنتوي الياباني',
    3,
  ),

  va('VA030', [3], 7000, '🏠',
    ['🏠', '🏡', '🏚️', '🏘️'],
    'Select the ABANDONED HOUSE (broken building)',
    'اختر المنزل المهجور (المبنى المتهالك)',
    2,
  ),

  // ── Plants ────────────────────────────────────────────────────────────────

  va('VA031', [1], 8000, '🌻',
    ['🌹', '🌻', '🌷', '🌸'],
    'Find the ROSE',
    'ابحث عن الوردة',
    0,
  ),

  va('VA032', [1, 2], 8000, '🌴',
    ['🌵', '🌴', '🎋', '🌲'],
    'Choose the CACTUS',
    'اختر الصبار',
    0,
  ),

  va('VA033', [2], 7000, '🍀',
    ['🌿', '🍀', '🪴', '🌱'],
    'Select the POTTED PLANT',
    'اختر النبتة في الأصيص',
    2,
  ),

  va('VA034', [2, 3], 7000, '🎋',
    ['🌲', '🎄', '🎋', '🌳'],
    'Pick the CHRISTMAS TREE',
    'اختر شجرة الكريسماس',
    1,
  ),

  va('VA035', [3], 7000, '🌱',
    ['🌿', '🍃', '🌱', '🪴'],
    'Find the HERB / LEAFY GREENS',
    'ابحث عن الأعشاب / الأوراق الخضراء',
    1,
  ),

  // ── Electronics ───────────────────────────────────────────────────────────

  va('VA036', [1], 8000, '📺',
    ['📷', '📺', '📻', '🖨️'],
    'Choose the CAMERA',
    'اختر الكاميرا',
    0,
  ),

  va('VA037', [1, 2], 8000, '🎮',
    ['🕹️', '🎮', '📱', '💻'],
    'Pick the JOYSTICK (classic arcade stick)',
    'اختر عصا التحكم الكلاسيكية',
    0,
  ),

  va('VA038', [2], 7000, '📻',
    ['📺', '📡', '🖥️', '📻'],
    'Find the SATELLITE DISH',
    'ابحث عن الطبق اللاقط',
    1,
  ),

  va('VA039', [2, 3], 7000, '🖥️',
    ['💻', '🖥️', '⌚', '📟'],
    'Select the SMARTWATCH',
    'اختر الساعة الذكية',
    2,
  ),

  va('VA040', [3, 4], 7000, '⌨️',
    ['🖱️', '💾', '⌨️', '🖨️'],
    'Choose the FLOPPY DISK (old storage)',
    'اختر القرص المرن (تخزين قديم)',
    1,
  ),

  // ── Food items ────────────────────────────────────────────────────────────

  va('VA041', [1], 8000, '🍕',
    ['🍔', '🍕', '🌮', '🍜'],
    'Find the BURGER',
    'ابحث عن البرغر',
    0,
  ),

  va('VA042', [1, 2], 8000, '🍜',
    ['🍱', '🍙', '🍣', '🍜'],
    'Pick the SUSHI',
    'اختر السوشي',
    2,
  ),

  va('VA043', [2], 7000, '🍰',
    ['🎂', '🍰', '🧁', '🍩'],
    'Choose the DONUT',
    'اختر الدونت',
    3,
  ),

  // ── Advanced counting + deception ─────────────────────────────────────────

  va('VA044', [3, 4], 9000, '⭐⭐🌟⭐⭐',
    ['1', '2', '3', '4'],
    'Count the GLOWING stars 🌟 only (not the regular ⭐)',
    'عدّ النجوم المضيئة 🌟 فقط (ليس النجوم العادية ⭐)',
    0,   // 1 glowing star
  ),

  va('VA045', [4], 9000, '🔴🔵🔴🟢🔴',
    ['1', '2', '3', '4'],
    'How many BLUE circles are shown?',
    'كم دائرة زرقاء مُعروضة؟',
    0,   // 1 blue
  ),

  // ── More Animals ──────────────────────────────────────────────────────────

  va('VA046', [1], 8000, '🦁',
    ['🐯', '🦁', '🐆', '🦊'],
    'Find the TIGER',
    'ابحث عن النمر',
    0,
  ),

  va('VA047', [1, 2], 8000, '🐸',
    ['🐊', '🐢', '🦎', '🐸'],
    'Select the CROCODILE',
    'اختر التمساح',
    0,
  ),

  va('VA048', [1], 8000, '🐠',
    ['🐟', '🐡', '🐠', '🦈'],
    'Choose the BLOWFISH',
    'اختر سمكة اليسر المنفوخة',
    1,
  ),

  va('VA049', [2], 7000, '🦚',
    ['🦜', '🦢', '🦩', '🦚'],
    'Pick the FLAMINGO',
    'اختر طائر الفلامنغو',
    2,
  ),

  va('VA050', [1, 2], 8000, '🐙',
    ['🦑', '🐙', '🦐', '🦀'],
    'Find the SQUID',
    'ابحث عن الحبار',
    0,
  ),

  va('VA051', [2], 7000, '🐉',
    ['🦕', '🦖', '🐉', '🐊'],
    'Choose the T-REX DINOSAUR',
    'اختر ديناصور تي ريكس',
    1,
  ),

  va('VA052', [1], 8000, '🐝',
    ['🐝', '🦋', '🐛', '🪲'],
    'Select the BUTTERFLY',
    'اختر الفراشة',
    1,
  ),

  va('VA053', [2, 3], 7000, '🦒',
    ['🦓', '🦒', '🐪', '🦘'],
    'Pick the ZEBRA',
    'اختر الحمار الوحشي',
    0,
  ),

  va('VA054', [1], 8000, '🐺',
    ['🦊', '🐶', '🐺', '🦡'],
    'Find the FOX',
    'ابحث عن الثعلب',
    0,
  ),

  va('VA055', [2], 7000, '🦦',
    ['🦡', '🦦', '🦫', '🦔'],
    'Choose the OTTER',
    'اختر القضاعة',
    0,
  ),

  va('VA056', [1, 2], 8000, '🐘',
    ['🦏', '🦛', '🐘', '🦒'],
    'Select the RHINO',
    'اختر وحيد القرن',
    0,
  ),

  va('VA057', [2, 3], 7000, '🦅',
    ['🦆', '🦢', '🦜', '🦅'],
    'Find the DUCK',
    'ابحث عن البطة',
    0,
  ),

  va('VA058', [1], 8000, '🐇',
    ['🐹', '🐭', '🐇', '🦔'],
    'Choose the HAMSTER',
    'اختر الهامستر',
    0,
  ),

  va('VA059', [3], 7000, '🦟',
    ['🪲', '🦗', '🦟', '🐜'],
    'Pick the CRICKET (insect)',
    'اختر الجندب',
    1,
  ),

  va('VA060', [2], 7000, '🐋',
    ['🐬', '🦭', '🐋', '🦈'],
    'Find the SEAL',
    'ابحث عن الفقمة',
    1,
  ),

  // ── More Vehicles ─────────────────────────────────────────────────────────

  va('VA061', [1], 8000, '🚌',
    ['🚌', '🚐', '🚎', '🏎️'],
    'Select the SPORTS CAR',
    'اختر سيارة السباق',
    3,
  ),

  va('VA062', [1, 2], 8000, '🚢',
    ['⛵', '🚢', '🛥️', '🚤'],
    'Find the SPEEDBOAT',
    'ابحث عن قارب السرعة',
    3,
  ),

  va('VA063', [2], 7000, '🏍️',
    ['🚲', '🛵', '🏍️', '🚗'],
    'Choose the BICYCLE',
    'اختر الدراجة الهوائية',
    0,
  ),

  va('VA064', [1], 8000, '🚂',
    ['🚄', '🚅', '🚂', '🚃'],
    'Pick the HIGH-SPEED TRAIN',
    'اختر القطار فائق السرعة',
    0,
  ),

  va('VA065', [2, 3], 7000, '🚁',
    ['✈️', '🛩️', '🚁', '🛸'],
    'Find the SMALL PLANE (light aircraft)',
    'ابحث عن الطائرة الصغيرة',
    1,
  ),

  va('VA066', [1], 8000, '🚀',
    ['🛸', '🚀', '🛩️', '✈️'],
    'Select the UFO / FLYING SAUCER',
    'اختر الطبق الطائر',
    0,
  ),

  va('VA067', [2], 7000, '🚒',
    ['🚑', '🚒', '🚓', '🚐'],
    'Find the AMBULANCE',
    'ابحث عن سيارة الإسعاف',
    0,
  ),

  // ── More Food ─────────────────────────────────────────────────────────────

  va('VA068', [1], 8000, '🍦',
    ['🍦', '🍧', '🍨', '🍡'],
    'Find the SHAVED ICE (snow cone)',
    'ابحث عن الثلج المجروش',
    1,
  ),

  va('VA069', [1, 2], 8000, '🌮',
    ['🌮', '🌯', '🥙', '🫔'],
    'Choose the WRAP / BURRITO',
    'اختر الرول الملفوف',
    1,
  ),

  va('VA070', [2], 7000, '🍣',
    ['🍱', '🍣', '🦐', '🍤'],
    'Select the BENTO BOX',
    'اختر علبة بينتو',
    0,
  ),

  va('VA071', [1], 8000, '🥐',
    ['🍞', '🥐', '🥖', '🥨'],
    'Pick the BAGUETTE',
    'اختر الخبز الفرنسي',
    2,
  ),

  va('VA072', [1, 2], 8000, '🍷',
    ['🍸', '🍷', '🍹', '🥂'],
    'Find the COCKTAIL GLASS',
    'ابحث عن كوب الكوكتيل',
    0,
  ),

  va('VA073', [1], 8000, '🧁',
    ['🎂', '🧁', '🍰', '🍩'],
    'Choose the BIRTHDAY CAKE',
    'اختر كعكة عيد الميلاد',
    0,
  ),

  va('VA074', [2], 7000, '🥑',
    ['🥝', '🥑', '🫒', '🍈'],
    'Select the OLIVE',
    'اختر الزيتون',
    2,
  ),

  va('VA075', [2, 3], 7000, '🫕',
    ['🍲', '🥘', '🫕', '🍜'],
    'Find the PAELLA / RICE DISH',
    'ابحث عن طبق الأرز',
    1,
  ),

  // ── More Flags ────────────────────────────────────────────────────────────

  va('VA076', [2], 8000, '🇺🇸',
    ['🇬🇧', '🇺🇸', '🇦🇺', '🇨🇦'],
    'Find the UK (British) flag',
    'ابحث عن العلم البريطاني',
    0,
  ),

  va('VA077', [2, 3], 7000, '🇸🇦',
    ['🇮🇷', '🇸🇦', '🇵🇰', '🇮🇶'],
    'Select the IRAN flag',
    'اختر العلم الإيراني',
    0,
  ),

  va('VA078', [2], 7000, '🇩🇪',
    ['🇦🇹', '🇧🇪', '🇩🇪', '🇸🇰'],
    'Choose the AUSTRIA flag',
    'اختر العلم النمساوي',
    0,
  ),

  va('VA079', [3], 7000, '🇮🇳',
    ['🇵🇰', '🇧🇩', '🇮🇳', '🇳🇬'],
    'Find the PAKISTAN flag',
    'ابحث عن العلم الباكستاني',
    0,
  ),

  va('VA080', [3, 4], 6000, '🇹🇷',
    ['🇲🇦', '🇹🇳', '🇩🇿', '🇹🇷'],
    'Select the MOROCCO flag',
    'اختر العلم المغربي',
    0,
  ),

  va('VA081', [2], 7000, '🇧🇷',
    ['🇧🇴', '🇵🇪', '🇧🇷', '🇨🇴'],
    'Find the PERU flag',
    'ابحث عن علم بيرو',
    1,
  ),

  va('VA082', [3], 7000, '🇮🇹',
    ['🇮🇪', '🇮🇹', '🇫🇷', '🇲🇽'],
    'Choose the IRELAND flag',
    'اختر العلم الإيرلندي',
    0,
  ),

  // ── More Sports items ─────────────────────────────────────────────────────

  va('VA083', [1], 8000, '🏆',
    ['🥇', '🥈', '🏆', '🎖️'],
    'Pick the SILVER MEDAL',
    'اختر الميدالية الفضية',
    1,
  ),

  va('VA084', [1, 2], 8000, '⛳',
    ['🏑', '🏒', '⛳', '🥅'],
    'Select the HOCKEY STICK',
    'اختر عصا الهوكي',
    1,
  ),

  va('VA085', [2], 7000, '🏊',
    ['🏄', '🤽', '🚣', '🏊'],
    'Choose the SURFER',
    'اختر راكب الأمواج',
    0,
  ),

  va('VA086', [1], 8000, '🎿',
    ['⛷️', '🏂', '🎿', '🛷'],
    'Find the SNOWBOARDER',
    'ابحث عن راكب الثلج',
    1,
  ),

  va('VA087', [2, 3], 7000, '🥊',
    ['🥋', '🤼', '🥊', '🏋️'],
    'Select the MARTIAL ARTS UNIFORM',
    'اختر زي الفنون القتالية',
    0,
  ),

  va('VA088', [1], 8000, '🎯',
    ['🏹', '🎯', '🔫', '🎳'],
    'Pick the BOWLING PINS',
    'اختر أقماع البولينغ',
    3,
  ),

  // ── More Electronics / Objects ────────────────────────────────────────────

  va('VA089', [1], 8000, '🔋',
    ['🔌', '🔋', '💡', '🔦'],
    'Find the LIGHT BULB',
    'ابحث عن المصباح الكهربائي',
    2,
  ),

  va('VA090', [1, 2], 8000, '📷',
    ['🎥', '📷', '📸', '📹'],
    'Choose the VIDEO CAMERA',
    'اختر كاميرا التصوير المرئي',
    0,
  ),

  va('VA091', [2], 7000, '⌚',
    ['⌚', '⏰', '⏱️', '🕰️'],
    'Select the ALARM CLOCK',
    'اختر المنبه',
    1,
  ),

  va('VA092', [2, 3], 7000, '🖱️',
    ['⌨️', '🖱️', '💾', '🖨️'],
    'Pick the KEYBOARD',
    'اختر لوحة المفاتيح',
    0,
  ),

  va('VA093', [1], 8000, '🔑',
    ['🗝️', '🔑', '🔒', '🔓'],
    'Find the OLD / ANTIQUE KEY',
    'ابحث عن المفتاح القديم',
    0,
  ),

  va('VA094', [2], 7000, '🎙️',
    ['🎤', '🎙️', '📻', '🔊'],
    'Choose the MICROPHONE',
    'اختر الميكروفون',
    0,
  ),

  va('VA095', [1, 2], 8000, '🖊️',
    ['✏️', '🖊️', '🖋️', '📌'],
    'Select the FOUNTAIN PEN',
    'اختر القلم الريشة',
    2,
  ),

  va('VA096', [2, 3], 7000, '🧲',
    ['⚙️', '🔩', '🪝', '🧲'],
    'Find the HOOK',
    'ابحث عن الخطاف',
    2,
  ),

  // ── More Buildings / Landmarks ────────────────────────────────────────────

  va('VA097', [1], 8000, '🏟️',
    ['🏰', '🏟️', '🏯', '🕍'],
    'Find the CASTLE',
    'ابحث عن القلعة',
    0,
  ),

  va('VA098', [1, 2], 8000, '🗼',
    ['🗽', '🗼', '🏯', '⛩️'],
    'Choose the STATUE OF LIBERTY',
    'اختر تمثال الحرية',
    0,
  ),

  va('VA099', [2], 7000, '🏦',
    ['🏢', '🏦', '🏣', '🏨'],
    'Select the POST OFFICE',
    'اختر مكتب البريد',
    2,
  ),

  va('VA100', [2, 3], 7000, '⛺',
    ['🏕️', '⛺', '🛖', '🏠'],
    'Find the HUT / STRAW HUT',
    'ابحث عن الكوخ',
    2,
  ),

  va('VA101', [3], 7000, '🏯',
    ['🏰', '🏯', '🕌', '🛕'],
    'Select the HINDU TEMPLE',
    'اختر المعبد الهندوسي',
    3,
  ),

  // ── More Plants ───────────────────────────────────────────────────────────

  va('VA102', [1], 8000, '🌹',
    ['🌸', '🌹', '🌷', '🌺'],
    'Find the TULIP',
    'ابحث عن زهرة التوليب',
    2,
  ),

  va('VA103', [1, 2], 8000, '🌿',
    ['🍃', '🌿', '🪴', '🎋'],
    'Choose the POTTED PLANT',
    'اختر النبتة في الأصيص',
    2,
  ),

  va('VA104', [2], 7000, '🍁',
    ['🍂', '🍁', '🌿', '🍀'],
    'Find the FALLEN LEAVES (autumn leaves)',
    'ابحث عن أوراق الخريف',
    0,
  ),

  va('VA105', [1], 8000, '🌵',
    ['🌴', '🌵', '🌲', '🎋'],
    'Select the PALM TREE',
    'اختر النخلة',
    0,
  ),

  va('VA106', [2, 3], 7000, '🌾',
    ['🌱', '🌾', '🍀', '🪴'],
    'Pick the SEEDLING (sprout)',
    'اختر البذرة النابتة',
    0,
  ),

  // ── More Counting challenges ───────────────────────────────────────────────

  va('VA107', [3, 4], 9000, '🌙🌙⭐🌙🌙',
    ['1', '2', '3', '4'],
    'How many STARS ⭐ are shown? (not moons 🌙)',
    'كم نجمة ⭐ مُعروضة؟ (ليس القمر 🌙)',
    0,   // 1 star
  ),

  va('VA108', [3], 9000, '🐱🐶🐱🐱🐶',
    ['1', '2', '3', '4'],
    'Count only the DOGS 🐶',
    'عدّ الكلاب 🐶 فقط',
    1,   // 2 dogs
  ),

  va('VA109', [3, 4], 9000, '🌸🌸🌺🌸🌼',
    ['1', '2', '3', '4'],
    'Count the HIBISCUS 🌺 flowers only',
    'عدّ أزهار الكركديه 🌺 فقط',
    0,   // 1 hibiscus
  ),

  va('VA110', [4], 9000, '🦁🐯🦁🐆🦁',
    ['1', '2', '3', '4'],
    'How many LIONS 🦁 do you see?',
    'كم أسداً 🦁 تشاهد؟',
    2,   // 3 lions
  ),

  va('VA111', [3], 9000, '🍎🍊🍎🍋🍎',
    ['1', '2', '3', '4'],
    'Count the APPLES 🍎 only',
    'عدّ التفاحات 🍎 فقط',
    2,   // 3 apples
  ),

  va('VA112', [3, 4], 9000, '🔥🔥💧🔥💧',
    ['1', '2', '3', '4'],
    'How many WATER DROPS 💧 are there?',
    'كم قطرة ماء 💧 تشاهد؟',
    1,   // 2 water drops
  ),

  va('VA113', [4], 9000, '⚽🏀⚽🏈⚽',
    ['1', '2', '3', '4'],
    'Count ONLY the soccer balls ⚽',
    'عدّ كرات القدم ⚽ فقط',
    2,   // 3 soccer balls
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// PUZZLE / ASSEMBLY POOL
// Timer model: 'puzzle' (longer, different UX than knowledge questions)
// pieceCount stored for future interactive drag-and-drop UI
// div3: 7–10 pieces  div2: 10–15  pro: 15–25  champions: 25+
// ═════════════════════════════════════════════════════════════════════════════

export const PUZZLE_POOL: PuzzleAssemblyQuestion[] = [

  pz('PZ001', [1], 30000, 8,
    [
      '🌸 → ☀️ → 🍂 → ❄️',
      '☀️ → 🌸 → 🍂 → ❄️',
      '🌸 → 🍂 → ☀️ → ❄️',
      '❄️ → 🌸 → ☀️ → 🍂',
    ],
    'Arrange the four seasons in correct order starting from Spring',
    'رتب فصول السنة الأربعة بدءاً من الربيع',
    0,
  ),

  pz('PZ002', [1], 30000, 7,
    [
      '🥚 → 🐣 → 🐔',
      '🐣 → 🥚 → 🐔',
      '🐔 → 🥚 → 🐣',
      '🥚 → 🐔 → 🐣',
    ],
    'Order the chicken life cycle from beginning to end',
    'رتب دورة حياة الدجاجة من البداية إلى النهاية',
    0,
  ),

  pz('PZ003', [2], 25000, 12,
    [
      'Mercury → Venus → Earth → Mars',
      'Venus → Mercury → Earth → Mars',
      'Mercury → Earth → Venus → Mars',
      'Earth → Venus → Mercury → Mars',
    ],
    'Arrange these planets in order of distance from the Sun',
    'رتب هذه الكواكب بحسب بعدها عن الشمس',
    0,
  ),

  pz('PZ004', [2], 25000, 10,
    [
      '🏺 Ancient Egypt → ⚔️ Roman Empire → 🗼 French Revolution → 🚀 Moon Landing',
      '⚔️ Roman Empire → 🏺 Ancient Egypt → 🗼 French Revolution → 🚀 Moon Landing',
      '🏺 Ancient Egypt → 🗼 French Revolution → ⚔️ Roman Empire → 🚀 Moon Landing',
      '🚀 Moon Landing → 🗼 French Revolution → ⚔️ Roman Empire → 🏺 Ancient Egypt',
    ],
    'Arrange these historical events from oldest to most recent',
    'رتب هذه الأحداث التاريخية من الأقدم إلى الأحدث',
    0,
  ),

  pz('PZ005', [3], 20000, 16,
    [
      '🌿 → 🐇 → 🦊 → 🦅',
      '🐇 → 🌿 → 🦊 → 🦅',
      '🌿 → 🦊 → 🐇 → 🦅',
      '🌿 → 🐇 → 🦅 → 🦊',
    ],
    'Arrange this food chain from producer to apex predator (Grass → Rabbit → Fox → Eagle)',
    'رتب هذه السلسلة الغذائية من المنتج إلى المفترس الأعلى (عشب ← أرنب ← ثعلب ← نسر)',
    0,
  ),

  pz('PZ006', [3], 20000, 20,
    [
      '🐜 → 🐭 → 🐕 → 🐘',
      '🐭 → 🐜 → 🐕 → 🐘',
      '🐜 → 🐭 → 🐘 → 🐕',
      '🐘 → 🐕 → 🐭 → 🐜',
    ],
    'Arrange from SMALLEST to LARGEST: Ant 🐜, Mouse 🐭, Dog 🐕, Elephant 🐘',
    'رتب من الأصغر إلى الأكبر: نملة، فأر، كلب، فيل',
    0,
  ),

  pz('PZ007', [4], 18000, 28,
    [
      'All three are equal (all = 8)',
      '(5+3) is the greatest',
      '(4×2) is the greatest',
      '(10-2) is the greatest',
    ],
    'Deception: Compare (5+3), (4×2), and (10-2). What is TRUE?',
    'تحدٍّ خادع: قارن (5+3)، (4×2)، و(10-2). ما الصحيح؟',
    0,
  ),

  pz('PZ008', [4], 18000, 25,
    [
      '2⁰ → 2² → 2³ → 2⁴  (1 → 4 → 8 → 16)',
      '2⁰ → 2³ → 2² → 2⁴  (1 → 8 → 4 → 16)',
      '2² → 2⁰ → 2³ → 2⁴  (4 → 1 → 8 → 16)',
      '2⁴ → 2³ → 2² → 2⁰  (16 → 8 → 4 → 1)',
    ],
    'Arrange these powers of 2 in ASCENDING order: 2⁰, 2², 2⁴, 2³',
    'رتب قوى العدد 2 تصاعدياً: 2⁰، 2²، 2⁴، 2³',
    0,
  ),

  // ── Division III additional ───────────────────────────────────────────────

  pz('PZ009', [1], 30000, 9,
    [
      '🌊 → ☁️ → 🌧️ → 🌊',
      '☁️ → 🌊 → 🌧️ → ☁️',
      '🌧️ → ☁️ → 🌊 → 🌧️',
      '☁️ → 🌧️ → 🌊 → ☁️',
    ],
    'Arrange the water cycle: Evaporation (ocean) → Cloud formation → Rain → Back to ocean',
    'رتب دورة الماء: تبخر (المحيط) ← تكوّن السحاب ← مطر ← العودة للمحيط',
    0,
  ),

  pz('PZ010', [1], 30000, 8,
    [
      '🌑 → 🌒 → 🌓 → 🌕',
      '🌕 → 🌓 → 🌒 → 🌑',
      '🌒 → 🌑 → 🌕 → 🌓',
      '🌓 → 🌒 → 🌑 → 🌕',
    ],
    'Arrange the moon phases from New Moon to Full Moon',
    'رتب مراحل القمر من المحاق إلى البدر',
    0,
  ),

  // ── Division II additional ────────────────────────────────────────────────

  pz('PZ011', [2], 25000, 12,
    [
      '🌐 → 🖥️ → 📧 → 📲',
      '🖥️ → 🌐 → 📲 → 📧',
      '📧 → 🖥️ → 🌐 → 📲',
      '📲 → 📧 → 🖥️ → 🌐',
    ],
    'Arrange internet milestones in chronological order: WWW invented → Home PCs → Email → Smartphones',
    'رتب معالم الإنترنت زمنياً: اختراع الويب ← الحاسوب المنزلي ← البريد الإلكتروني ← الهواتف الذكية',
    0,
  ),

  pz('PZ012', [2], 25000, 11,
    [
      '🥚 → 🐛 → 🦋 (egg → caterpillar → butterfly)',
      '🐛 → 🥚 → 🦋 (caterpillar → egg → butterfly)',
      '🦋 → 🐛 → 🥚 (butterfly → caterpillar → egg)',
      '🥚 → 🦋 → 🐛 (egg → butterfly → caterpillar)',
    ],
    'Order the butterfly life cycle from start to finish',
    'رتب دورة حياة الفراشة من البداية إلى النهاية',
    0,
  ),

  // ── Pro League additional ─────────────────────────────────────────────────

  pz('PZ013', [3], 20000, 18,
    [
      'Hydrogen (1) → Carbon (6) → Oxygen (8) → Gold (79)',
      'Carbon (6) → Hydrogen (1) → Oxygen (8) → Gold (79)',
      'Hydrogen (1) → Oxygen (8) → Carbon (6) → Gold (79)',
      'Gold (79) → Oxygen (8) → Carbon (6) → Hydrogen (1)',
    ],
    'Arrange these elements by atomic number (lowest to highest)',
    'رتب هذه العناصر تصاعدياً حسب العدد الذري',
    0,
  ),

  // ── Champions additional ──────────────────────────────────────────────────

  pz('PZ014', [4], 18000, 26,
    [
      '🧬 DNA → 🦠 Cell → 🫀 Organ → 🧍 Body',
      '🦠 Cell → 🧬 DNA → 🫀 Organ → 🧍 Body',
      '🫀 Organ → 🦠 Cell → 🧬 DNA → 🧍 Body',
      '🧍 Body → 🫀 Organ → 🦠 Cell → 🧬 DNA',
    ],
    'Arrange biological organisation from SMALLEST to LARGEST: DNA, Cell, Organ, Full body',
    'رتب التنظيم البيولوجي من الأصغر إلى الأكبر: الحمض النووي، الخلية، العضو، الجسم',
    0,
  ),

  // ── Division II extra (diff 2) ────────────────────────────────────────────

  pz('PZ015', [2], 25000, 11,
    [
      '🌱 Seed → 🌿 Sprout → 🌳 Tree → 🍎 Fruit',
      '🌿 Sprout → 🌱 Seed → 🌳 Tree → 🍎 Fruit',
      '🌳 Tree → 🌱 Seed → 🌿 Sprout → 🍎 Fruit',
      '🌱 Seed → 🌳 Tree → 🌿 Sprout → 🍎 Fruit',
    ],
    'Arrange a plant\'s life stages in correct order: Seed, Sprout, Tree, Fruit',
    'رتب مراحل حياة النبات بالترتيب: بذرة، بادرة، شجرة، ثمرة',
    0,
  ),

  pz('PZ016', [2], 25000, 10,
    [
      '☀️ Sun → 🌊 Ocean → ☁️ Cloud → 🌧️ Rain → 🌱 Plant',
      '🌊 Ocean → ☀️ Sun → 🌧️ Rain → ☁️ Cloud → 🌱 Plant',
      '☁️ Cloud → ☀️ Sun → 🌊 Ocean → 🌧️ Rain → 🌱 Plant',
      '🌱 Plant → 🌊 Ocean → ☀️ Sun → ☁️ Cloud → 🌧️ Rain',
    ],
    'Arrange the energy + water cycle: Sun heats ocean → cloud forms → rain falls → plant grows',
    'رتب دورة الطاقة والماء: الشمس تسخن المحيط ← يتشكل سحاب ← ينزل المطر ← تنمو النبتة',
    0,
  ),

  pz('PZ017', [2], 25000, 13,
    [
      '🥚 Egg → 🐛 Larva → 🫘 Pupa → 🦗 Adult insect',
      '🐛 Larva → 🥚 Egg → 🫘 Pupa → 🦗 Adult insect',
      '🥚 Egg → 🫘 Pupa → 🐛 Larva → 🦗 Adult insect',
      '🦗 Adult insect → 🫘 Pupa → 🐛 Larva → 🥚 Egg',
    ],
    'Order the complete metamorphosis cycle of an insect: Egg, Larva, Pupa, Adult',
    'رتب دورة التحول الكامل للحشرة: بيضة، يرقة، خادرة، حشرة بالغة',
    0,
  ),

  // ── Pro League extra (diff 3) ─────────────────────────────────────────────

  pz('PZ018', [3], 20000, 17,
    [
      '🔭 Telescope (1608) → 💡 Light bulb (1879) → 📻 Radio (1895) → 🖥️ Computer (1940s)',
      '💡 Light bulb (1879) → 🔭 Telescope (1608) → 📻 Radio (1895) → 🖥️ Computer (1940s)',
      '🔭 Telescope (1608) → 📻 Radio (1895) → 💡 Light bulb (1879) → 🖥️ Computer (1940s)',
      '🖥️ Computer (1940s) → 📻 Radio (1895) → 💡 Light bulb (1879) → 🔭 Telescope (1608)',
    ],
    'Arrange these inventions in chronological order (oldest to newest)',
    'رتب هذه الاختراعات زمنياً من الأقدم إلى الأحدث',
    0,
  ),

  pz('PZ019', [3], 20000, 19,
    [
      '1 → 1 → 2 → 3 → 5 → 8',
      '1 → 2 → 3 → 5 → 8 → 13',
      '0 → 1 → 1 → 2 → 3 → 5',
      '2 → 3 → 5 → 7 → 11 → 13',
    ],
    'Which sequence correctly continues the Fibonacci pattern?',
    'أي متتالية تمثل الاستمرار الصحيح لمتتالية فيبوناتشي؟',
    0,
  ),

  pz('PZ020', [3], 20000, 18,
    [
      '🌑 New Moon → 🌒 Waxing Crescent → 🌓 First Quarter → 🌔 Waxing Gibbous → 🌕 Full Moon',
      '🌕 Full Moon → 🌔 Waxing Gibbous → 🌓 First Quarter → 🌒 Waxing Crescent → 🌑 New Moon',
      '🌑 New Moon → 🌔 Waxing Gibbous → 🌒 Waxing Crescent → 🌓 First Quarter → 🌕 Full Moon',
      '🌒 Waxing Crescent → 🌑 New Moon → 🌓 First Quarter → 🌔 Waxing Gibbous → 🌕 Full Moon',
    ],
    'Arrange ALL FIVE lunar phases in correct order from New Moon to Full Moon',
    'رتب المراحل الخمس للقمر بالترتيب الصحيح من المحاق إلى البدر',
    0,
  ),

  pz('PZ021', [3], 20000, 22,
    [
      'Roman numerals: I (1) → V (5) → X (10) → L (50) → C (100)',
      'Roman numerals: I (1) → X (10) → V (5) → L (50) → C (100)',
      'Roman numerals: V (5) → I (1) → X (10) → C (100) → L (50)',
      'Roman numerals: I (1) → V (5) → L (50) → X (10) → C (100)',
    ],
    'Arrange Roman numerals in ascending order: I, V, X, L, C',
    'رتب الأرقام الرومانية تصاعدياً: I، V، X، L، C',
    0,
  ),

  // ── Champions extra (diff 4) ──────────────────────────────────────────────

  pz('PZ022', [4], 18000, 27,
    [
      '🔵 Quark → ⚛️ Proton/Neutron → 🔮 Nucleus → ⚡ Atom → 🧬 Molecule',
      '⚛️ Proton/Neutron → 🔵 Quark → 🔮 Nucleus → ⚡ Atom → 🧬 Molecule',
      '🧬 Molecule → ⚡ Atom → 🔮 Nucleus → ⚛️ Proton/Neutron → 🔵 Quark',
      '🔵 Quark → 🔮 Nucleus → ⚛️ Proton/Neutron → ⚡ Atom → 🧬 Molecule',
    ],
    'Arrange matter from SMALLEST to LARGEST: Quark, Proton/Neutron, Nucleus, Atom, Molecule',
    'رتب المادة من الأصغر إلى الأكبر: كوارك، بروتون/نيوترون، نواة، ذرة، جزيء',
    0,
  ),

  pz('PZ023', [4], 18000, 29,
    [
      '🌋 Big Bang → ⭐ First Stars → 🌌 Galaxies → ☀️ Solar System → 🌍 Earth → 🧬 Life',
      '⭐ First Stars → 🌋 Big Bang → 🌌 Galaxies → ☀️ Solar System → 🌍 Earth → 🧬 Life',
      '🌋 Big Bang → 🌌 Galaxies → ⭐ First Stars → 🌍 Earth → ☀️ Solar System → 🧬 Life',
      '🧬 Life → 🌍 Earth → ☀️ Solar System → 🌌 Galaxies → ⭐ First Stars → 🌋 Big Bang',
    ],
    'Arrange the history of the universe in correct chronological order',
    'رتب تاريخ الكون بالترتيب الزمني الصحيح',
    0,
  ),

  pz('PZ024', [4], 18000, 24,
    [
      '1 → 4 → 9 → 16 → 25  (1², 2², 3², 4², 5²)',
      '1 → 3 → 6 → 10 → 15  (triangular numbers)',
      '2 → 4 → 8 → 16 → 32  (powers of 2)',
      '1 → 2 → 6 → 24 → 120 (factorials)',
    ],
    'Which sequence represents PERFECT SQUARES in ascending order?',
    'أي متتالية تمثل المربعات الكاملة بالترتيب التصاعدي؟',
    0,
  ),

  pz('PZ025', [4], 18000, 25,
    [
      '🧊 Solid → 💧 Liquid → 💨 Gas → ⚡ Plasma',
      '💧 Liquid → 🧊 Solid → 💨 Gas → ⚡ Plasma',
      '🧊 Solid → 💨 Gas → 💧 Liquid → ⚡ Plasma',
      '⚡ Plasma → 💨 Gas → 💧 Liquid → 🧊 Solid',
    ],
    'Arrange states of matter in order of increasing energy/temperature',
    'رتب حالات المادة تصاعدياً حسب الطاقة/درجة الحرارة',
    0,
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// COMBINED POOL — single source of truth
// ═════════════════════════════════════════════════════════════════════════════

export const QUESTION_POOL: PoolQuestion[] = [
  ...SPORTS_POOL,
  ...CULTURE_POOL,
  ...GEO_POOL,
  ...HISTORY_POOL,
  ...PHILO_POOL,
  ...RELIGION_POOL,
  ...FAMOUS_POOL,
  ...VA_POOL,
  ...PUZZLE_POOL,
];

/** Map from category to human-readable label */
export const CATEGORY_LABELS: Record<QuestionCategory, { en: string; ar: string }> = {
  sports:           { en: 'Sports',               ar: 'رياضة'         },
  culture:          { en: 'Culture & Arts',        ar: 'الثقافة والفنون' },
  geography:        { en: 'Geography',             ar: 'الجغرافيا'     },
  history:          { en: 'History',               ar: 'التاريخ'       },
  philosophy:       { en: 'Philosophy & Figures',  ar: 'الفلسفة والشخصيات' },
  religious:        { en: 'Religious Knowledge',   ar: 'المعرفة الدينية'   },
  famous_people:    { en: 'Famous People',          ar: 'شخصيات مشهورة'     },
  visual_attention: { en: 'Visual Attention',      ar: 'الانتباه البصري'   },
  puzzle_assembly:  { en: 'Puzzle & Assembly',     ar: 'الألغاز والتركيب'  },
};

export const DIFFICULTY_LABELS: Record<number, { en: string; ar: string }> = {
  1: { en: 'Entry Level',   ar: 'مستوى مبتدئ'  },
  2: { en: 'Intermediate',  ar: 'مستوى متوسط'  },
  3: { en: 'Professional',  ar: 'مستوى احترافي' },
  4: { en: 'Champion',      ar: 'مستوى أبطال'  },
};
