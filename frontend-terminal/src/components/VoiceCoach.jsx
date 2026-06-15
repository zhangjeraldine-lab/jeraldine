import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/store';
import { canUseSpeech, speakNaturally, stopSpeech as stopAllSpeech } from '@/utils/speech';
import { getSpeechLang, isRTL, normalizeLang } from '@/utils/language';
import '../styles/VoiceCoach.css';

const STORAGE_KEY = 'layover.voiceCoach.seen.v1';
const SIDES = ['left', 'right'];

const UI_COPY = {
  zh: {
    start: '开始语音带教',
    replay: '重听带教',
    textStart: '开始文字带教',
    stop: '暂停',
    dismiss: '我会用了',
    speaking: '正在朗读',
    idle: '待播放',
    launcher: '语音带教',
    entry: '语音带教入口',
    fallback: '当前浏览器不支持语音合成，带教会以文字提示显示。',
    leftAria: '对面语音带教',
    rightAria: '正面语音带教',
  },
  en: {
    start: 'Start voice guide',
    replay: 'Replay guide',
    textStart: 'Start text guide',
    stop: 'Pause',
    dismiss: 'Got it',
    speaking: 'Speaking',
    idle: 'Ready',
    launcher: 'Voice guide',
    entry: 'Voice guide entry',
    fallback: 'This browser does not support speech synthesis, so the guide will stay on screen as text.',
    leftAria: 'Opposite-side voice guide',
    rightAria: 'Front-side voice guide',
  },
  ja: {
    start: '音声ガイド開始',
    replay: 'もう一度聞く',
    textStart: '文字ガイド開始',
    stop: '一時停止',
    dismiss: 'わかりました',
    speaking: '読み上げ中',
    idle: '待機中',
    launcher: '音声ガイド',
    entry: '音声ガイド入口',
    fallback: 'このブラウザは音声合成に対応していないため、ガイドは文字で表示されます。',
    leftAria: '向かい側の音声ガイド',
    rightAria: '正面側の音声ガイド',
  },
  ko: {
    start: '음성 안내 시작',
    replay: '다시 듣기',
    textStart: '문자 안내 시작',
    stop: '일시정지',
    dismiss: '알겠어요',
    speaking: '읽는 중',
    idle: '대기 중',
    launcher: '음성 안내',
    entry: '음성 안내 입구',
    fallback: '현재 브라우저가 음성 합성을 지원하지 않아 안내가 텍스트로 표시됩니다.',
    leftAria: '맞은편 음성 안내',
    rightAria: '정면 음성 안내',
  },
  es: {
    start: 'Iniciar guía',
    replay: 'Repetir guía',
    textStart: 'Iniciar guía de texto',
    stop: 'Pausar',
    dismiss: 'Entendido',
    speaking: 'Hablando',
    idle: 'Listo',
    launcher: 'Guía de voz',
    entry: 'Entrada de guía de voz',
    fallback: 'Este navegador no admite síntesis de voz; la guía se mostrará como texto.',
    leftAria: 'Guía de voz del lado opuesto',
    rightAria: 'Guía de voz del lado frontal',
  },
  fr: {
    start: 'Lancer le guide',
    replay: 'Réécouter',
    textStart: 'Lancer le guide texte',
    stop: 'Pause',
    dismiss: 'Compris',
    speaking: 'Lecture',
    idle: 'Prêt',
    launcher: 'Guide vocal',
    entry: 'Entrée du guide vocal',
    fallback: 'Ce navigateur ne prend pas en charge la synthèse vocale; le guide restera affiché en texte.',
    leftAria: 'Guide vocal du côté opposé',
    rightAria: 'Guide vocal du côté avant',
  },
  de: {
    start: 'Sprachguide starten',
    replay: 'Guide wiederholen',
    textStart: 'Textguide starten',
    stop: 'Pause',
    dismiss: 'Verstanden',
    speaking: 'Spricht',
    idle: 'Bereit',
    launcher: 'Sprachguide',
    entry: 'Einstieg zum Sprachguide',
    fallback: 'Dieser Browser unterstützt keine Sprachsynthese; die Anleitung bleibt als Text sichtbar.',
    leftAria: 'Sprachguide für die gegenüberliegende Seite',
    rightAria: 'Sprachguide für die Vorderseite',
  },
  ar: {
    start: 'ابدأ الإرشاد الصوتي',
    replay: 'أعد الإرشاد',
    textStart: 'ابدأ الإرشاد النصي',
    stop: 'إيقاف مؤقت',
    dismiss: 'فهمت',
    speaking: 'جار القراءة',
    idle: 'جاهز',
    launcher: 'إرشاد صوتي',
    entry: 'مدخل الإرشاد الصوتي',
    fallback: 'هذا المتصفح لا يدعم تركيب الصوت، لذلك سيظهر الإرشاد كنص.',
    leftAria: 'الإرشاد الصوتي للجهة المقابلة',
    rightAria: 'الإرشاد الصوتي للجهة الأمامية',
  },
};

const COACH_COPY = {
  home: {
    zh: {
      eyebrow: '使用带教',
      title: '请面向自己那半块屏幕',
      body: '两位旅客各自站到自己面前的半块屏幕前，一起选择“共创绘画”或“语言交换”。',
      sideNotes: {
        left: '对面旅客：你会看到旋转后的提示，请只操作自己面前的半块屏幕。',
        right: '正面旅客：请按正常方向阅读，只操作自己面前的半块屏幕。',
      },
      speak: '欢迎来到 Layover 共绘连接。请两位旅客各自面向自己面前的半块屏幕。先一起选择共创绘画，或者语言交换。接下来，每个人只操作自己面前的半块屏幕。',
    },
    en: {
      eyebrow: 'Guide',
      title: 'Face your own half of the screen',
      body: 'Each traveler stands in front of their own half of the screen, then choose Co-Drawing or Language Game together.',
      sideNotes: {
        left: 'Opposite traveler: your prompts are rotated for you. Only use the half of the screen in front of you.',
        right: 'Front traveler: read the screen normally. Only use the half of the screen in front of you.',
      },
      speak: 'Welcome to Layover Co-Drawing Connections. Each traveler should face the half of the screen directly in front of them. Choose co-drawing or the language game together. Each person only uses the screen half in front of them.',
    },
    ja: {
      eyebrow: 'ガイド',
      title: '自分の前の半分を見てください',
      body: '二人とも、自分の前にある半分の画面に向かって立ち、「共創ドローイング」か「言語ゲーム」を一緒に選びます。',
      sideNotes: {
        left: '向かい側の方：表示はあなた向けに回転しています。自分の前の半分だけを操作してください。',
        right: '正面の方：通常の向きで読めます。自分の前の半分だけを操作してください。',
      },
      speak: 'Layover 共描きコネクションへようこそ。二人とも、自分の前にある半分の画面に向かって立ってください。共創ドローイング、または言語ゲームを一緒に選びます。この後は、自分の前の半分だけを操作してください。',
    },
    ko: {
      eyebrow: '안내',
      title: '자기 앞의 반쪽 화면을 보세요',
      body: '두 사람은 각자 자기 앞의 반쪽 화면 앞에 서서, 함께 공동 그림 그리기나 언어 게임을 선택합니다.',
      sideNotes: {
        left: '맞은편 여행자: 안내가 당신에게 맞게 회전되어 보입니다. 자기 앞의 반쪽 화면만 조작하세요.',
        right: '정면 여행자: 화면을 정상 방향으로 읽으면 됩니다. 자기 앞의 반쪽 화면만 조작하세요.',
      },
      speak: 'Layover 공동 그림 연결에 오신 것을 환영합니다. 두 사람은 각자 자기 앞의 반쪽 화면을 바라봐 주세요. 함께 공동 그림 그리기 또는 언어 게임을 선택합니다. 다음부터는 각자 자기 앞의 반쪽 화면만 조작하세요.',
    },
    es: {
      eyebrow: 'Guía',
      title: 'Mira la mitad de pantalla frente a ti',
      body: 'Cada viajero se coloca frente a su propia mitad de pantalla y juntos eligen Dibujo compartido o Juego de idioma.',
      sideNotes: {
        left: 'Viajero del lado opuesto: las indicaciones están giradas para ti. Usa solo la mitad de pantalla frente a ti.',
        right: 'Viajero frontal: lee la pantalla en orientación normal. Usa solo la mitad de pantalla frente a ti.',
      },
      speak: 'Bienvenido a Layover Co-Drawing Connections. Cada viajero debe mirar la mitad de pantalla que tiene enfrente. Elijan juntos dibujo compartido o el juego de idioma. Cada persona usa solo la mitad de pantalla frente a ella.',
    },
    fr: {
      eyebrow: 'Guide',
      title: "Regardez votre moitié d'écran",
      body: "Chaque voyageur se place devant sa propre moitié d'écran, puis vous choisissez ensemble dessin partagé ou jeu de langue.",
      sideNotes: {
        left: "Voyageur en face : les indications sont tournées pour vous. Utilisez seulement la moitié d'écran devant vous.",
        right: "Voyageur de face : lisez normalement. Utilisez seulement la moitié d'écran devant vous.",
      },
      speak: "Bienvenue dans Layover Co-Drawing Connections. Chaque voyageur doit faire face à la moitié d'écran devant lui. Choisissez ensemble le dessin partagé ou le jeu de langue. Chacun utilise seulement sa propre moitié d'écran.",
    },
    de: {
      eyebrow: 'Anleitung',
      title: 'Schau auf deine Bildschirmhälfte',
      body: 'Beide Reisenden stehen vor ihrer eigenen Bildschirmhälfte und wählen gemeinsam Co-Drawing oder Sprachspiel.',
      sideNotes: {
        left: 'Gegenüber: Die Hinweise sind für dich gedreht. Benutze nur die Bildschirmhälfte vor dir.',
        right: 'Vorderseite: Lies den Bildschirm normal. Benutze nur die Bildschirmhälfte vor dir.',
      },
      speak: 'Willkommen bei Layover Co-Drawing Connections. Beide Reisenden schauen auf die Bildschirmhälfte direkt vor sich. Wählt gemeinsam Co-Drawing oder das Sprachspiel. Jede Person benutzt nur die eigene Bildschirmhälfte.',
    },
    ar: {
      eyebrow: 'إرشاد',
      title: 'انظر إلى نصف الشاشة أمامك',
      body: 'يقف كل مسافر أمام نصف الشاشة الخاص به، ثم تختاران معا الرسم المشترك أو لعبة اللغة.',
      sideNotes: {
        left: 'المسافر المقابل: التعليمات مدوّرة لتناسبك. استخدم فقط نصف الشاشة الموجود أمامك.',
        right: 'المسافر الأمامي: اقرأ الشاشة بالاتجاه الطبيعي. استخدم فقط نصف الشاشة الموجود أمامك.',
      },
      speak: 'مرحبا بك في Layover Co-Drawing Connections. على كل مسافر أن يواجه نصف الشاشة الموجود أمامه. اختارا معا الرسم المشترك أو لعبة اللغة. كل شخص يستخدم فقط نصف الشاشة أمامه.',
    },
  },
  selecting: {
    zh: {
      eyebrow: '选择语言',
      title: '双方各选自己的语言',
      body: '两个人都在自己面前的界面选好语言后，系统会自动进入当前活动。',
      sideNotes: {
        left: '对面旅客：在你面前的半块屏幕点选语言，然后等对方完成。',
        right: '正面旅客：在你面前的半块屏幕点选语言，然后等对方完成。',
      },
      speak: '现在请双方各自选择语言。请在自己面前的半块屏幕上点选语言。两个人都选好以后，系统会自动进入活动。',
    },
    en: {
      eyebrow: 'Language',
      title: 'Choose your own language',
      body: 'When both people choose a language on the interface in front of them, the activity starts automatically.',
      sideNotes: {
        left: 'Opposite traveler: choose your language on the half of the screen in front of you, then wait for your partner.',
        right: 'Front traveler: choose your language on the half of the screen in front of you, then wait for your partner.',
      },
      speak: 'Now each person chooses their own language on the screen half in front of them. When both are done, the activity starts automatically.',
    },
    ja: {
      eyebrow: '言語',
      title: '自分の言語を選びます',
      body: '二人がそれぞれ自分の前の画面で言語を選ぶと、アクティビティが自動で始まります。',
      sideNotes: {
        left: '向かい側の方：自分の前の半分で言語を選び、相手を待ってください。',
        right: '正面の方：自分の前の半分で言語を選び、相手を待ってください。',
      },
      speak: '今から、それぞれ自分の言語を選びます。自分の前の半分の画面で言語を選んでください。二人とも選び終わると、自動で始まります。',
    },
    ko: {
      eyebrow: '언어',
      title: '각자 언어를 선택하세요',
      body: '두 사람이 각자 자기 앞의 화면에서 언어를 선택하면 활동이 자동으로 시작됩니다.',
      sideNotes: {
        left: '맞은편 여행자: 자기 앞의 반쪽 화면에서 언어를 고른 뒤 상대를 기다리세요.',
        right: '정면 여행자: 자기 앞의 반쪽 화면에서 언어를 고른 뒤 상대를 기다리세요.',
      },
      speak: '이제 각자 자신의 언어를 선택하세요. 자기 앞의 반쪽 화면에서 언어를 고르면 됩니다. 두 사람이 모두 선택하면 활동이 자동으로 시작됩니다.',
    },
    es: {
      eyebrow: 'Idioma',
      title: 'Elige tu idioma',
      body: 'Cuando las dos personas elijan un idioma en la interfaz frente a ellas, la actividad empezará automáticamente.',
      sideNotes: {
        left: 'Viajero del lado opuesto: elige tu idioma en la mitad de pantalla frente a ti y espera a tu compañero.',
        right: 'Viajero frontal: elige tu idioma en la mitad de pantalla frente a ti y espera a tu compañero.',
      },
      speak: 'Ahora cada persona elige su propio idioma en la mitad de pantalla frente a ella. Cuando ambos terminen, la actividad empezará automáticamente.',
    },
    fr: {
      eyebrow: 'Langue',
      title: 'Choisissez votre langue',
      body: "Quand les deux personnes ont choisi leur langue sur l'interface devant elles, l'activité démarre automatiquement.",
      sideNotes: {
        left: "Voyageur en face : choisissez votre langue sur la moitié d'écran devant vous, puis attendez l'autre personne.",
        right: "Voyageur de face : choisissez votre langue sur la moitié d'écran devant vous, puis attendez l'autre personne.",
      },
      speak: "Maintenant, chaque personne choisit sa langue sur la moitié d'écran devant elle. Quand les deux choix sont faits, l'activité démarre automatiquement.",
    },
    de: {
      eyebrow: 'Sprache',
      title: 'Wähle deine Sprache',
      body: 'Wenn beide ihre Sprache auf der Fläche vor sich gewählt haben, startet die Aktivität automatisch.',
      sideNotes: {
        left: 'Gegenüber: Wähle deine Sprache auf der Bildschirmhälfte vor dir und warte auf die andere Person.',
        right: 'Vorderseite: Wähle deine Sprache auf der Bildschirmhälfte vor dir und warte auf die andere Person.',
      },
      speak: 'Jetzt wählt jede Person ihre eigene Sprache auf der Bildschirmhälfte vor sich. Wenn beide fertig sind, startet die Aktivität automatisch.',
    },
    ar: {
      eyebrow: 'اللغة',
      title: 'اختر لغتك',
      body: 'عندما يختار كل شخص لغته من الواجهة أمامه، يبدأ النشاط تلقائيا.',
      sideNotes: {
        left: 'المسافر المقابل: اختر لغتك من نصف الشاشة أمامك، ثم انتظر شريكك.',
        right: 'المسافر الأمامي: اختر لغتك من نصف الشاشة أمامك، ثم انتظر شريكك.',
      },
      speak: 'الآن يختار كل شخص لغته من نصف الشاشة الموجود أمامه. عندما ينتهي الاثنان، يبدأ النشاط تلقائيا.',
    },
  },
  drawing: {
    zh: {
      eyebrow: '共创绘画',
      title: '在自己面前的半屏画',
      body: '每个人用自己面前就近的工具栏选颜色、笔刷、橡皮和 AI 功能，画面会同步镜像给对方。',
      sideNotes: {
        left: '对面旅客：请只在自己面前的半块屏幕上画。',
        right: '正面旅客：请只在自己面前的半块屏幕上画。',
      },
      speak: '进入共创绘画。每个人只在自己面前的半块屏幕上画。就近的工具栏可以选择颜色、笔刷、橡皮、撤销和 AI 识别。你的笔触会同步镜像给对方。',
    },
    en: {
      eyebrow: 'Co-Drawing',
      title: 'Draw on the half in front of you',
      body: 'Use the nearby toolbar for color, brush, eraser, and AI tools. Your drawing is mirrored to your partner.',
      sideNotes: {
        left: 'Opposite traveler: draw only on the half of the screen in front of you.',
        right: 'Front traveler: draw only on the half of the screen in front of you.',
      },
      speak: 'You are now in co-drawing. Draw only on the half of the screen in front of you. Use the nearby toolbar for color, brush, eraser, undo, and AI recognition. Your strokes are mirrored to your partner.',
    },
    ja: {
      eyebrow: '共創ドローイング',
      title: '自分の前の半分に描きます',
      body: '近くのツールバーで色、ブラシ、消しゴム、AI 機能を選びます。描いた線は相手側にミラー表示されます。',
      sideNotes: {
        left: '向かい側の方：自分の前の半分だけに描いてください。',
        right: '正面の方：自分の前の半分だけに描いてください。',
      },
      speak: '共創ドローイングに入りました。自分の前の半分の画面だけに描いてください。近くのツールバーで色、ブラシ、消しゴム、取り消し、AI 認識を使えます。あなたの線は相手側にミラー表示されます。',
    },
    ko: {
      eyebrow: '공동 그림',
      title: '자기 앞의 반쪽에 그리세요',
      body: '가까운 도구막대에서 색, 브러시, 지우개, AI 기능을 고르세요. 그림은 상대에게 거울처럼 동기화됩니다.',
      sideNotes: {
        left: '맞은편 여행자: 자기 앞의 반쪽 화면에만 그리세요.',
        right: '정면 여행자: 자기 앞의 반쪽 화면에만 그리세요.',
      },
      speak: '공동 그림 그리기에 들어왔습니다. 각자 자기 앞의 반쪽 화면에만 그리세요. 가까운 도구막대에서 색, 브러시, 지우개, 실행 취소, AI 인식을 사용할 수 있습니다. 당신의 선은 상대에게 거울처럼 동기화됩니다.',
    },
    es: {
      eyebrow: 'Dibujo compartido',
      title: 'Dibuja en la mitad frente a ti',
      body: 'Usa la barra cercana para color, pincel, borrador y funciones de IA. El dibujo se refleja para tu compañero.',
      sideNotes: {
        left: 'Viajero del lado opuesto: dibuja solo en la mitad de pantalla frente a ti.',
        right: 'Viajero frontal: dibuja solo en la mitad de pantalla frente a ti.',
      },
      speak: 'Estás en dibujo compartido. Dibuja solo en la mitad de pantalla frente a ti. Usa la barra cercana para color, pincel, borrador, deshacer y reconocimiento de IA. Tus trazos se reflejan para tu compañero.',
    },
    fr: {
      eyebrow: 'Dessin partagé',
      title: "Dessinez sur votre moitié d'écran",
      body: "Utilisez la barre d'outils proche pour la couleur, le pinceau, la gomme et l'IA. Le dessin est reflété vers l'autre personne.",
      sideNotes: {
        left: "Voyageur en face : dessinez seulement sur la moitié d'écran devant vous.",
        right: "Voyageur de face : dessinez seulement sur la moitié d'écran devant vous.",
      },
      speak: "Vous êtes dans le dessin partagé. Dessinez seulement sur la moitié d'écran devant vous. Utilisez la barre d'outils proche pour la couleur, le pinceau, la gomme, annuler et la reconnaissance IA. Vos traits sont reflétés vers votre partenaire.",
    },
    de: {
      eyebrow: 'Co-Drawing',
      title: 'Zeichne auf deiner Hälfte',
      body: 'Nutze die Werkzeugleiste vor dir für Farbe, Pinsel, Radierer und KI. Deine Zeichnung wird gespiegelt.',
      sideNotes: {
        left: 'Gegenüber: Zeichne nur auf der Bildschirmhälfte vor dir.',
        right: 'Vorderseite: Zeichne nur auf der Bildschirmhälfte vor dir.',
      },
      speak: 'Du bist jetzt im Co-Drawing. Zeichne nur auf der Bildschirmhälfte vor dir. Nutze die nahe Werkzeugleiste für Farbe, Pinsel, Radierer, Rückgängig und KI-Erkennung. Deine Striche werden für die andere Person gespiegelt.',
    },
    ar: {
      eyebrow: 'الرسم المشترك',
      title: 'ارسم على النصف أمامك',
      body: 'استخدم شريط الأدوات القريب لاختيار اللون والفرشاة والممحاة وأدوات الذكاء الاصطناعي. سيظهر الرسم منعكسا لشريكك.',
      sideNotes: {
        left: 'المسافر المقابل: ارسم فقط على نصف الشاشة الموجود أمامك.',
        right: 'المسافر الأمامي: ارسم فقط على نصف الشاشة الموجود أمامك.',
      },
      speak: 'أنت الآن في الرسم المشترك. ارسم فقط على نصف الشاشة الموجود أمامك. استخدم شريط الأدوات القريب لاختيار اللون والفرشاة والممحاة والتراجع والتعرف بالذكاء الاصطناعي. ستنعكس خطوطك لشريكك.',
    },
  },
  language: {
    zh: {
      eyebrow: '语言交换',
      title: '一个人画，一个人学',
      body: '绘画方根据提示画图，点完成后，学习方从蓝点开始按顺序描红并学习读音。',
      sideNotes: {
        left: '绘画方：先按提示画出词语，让对方猜和学。',
        right: '学习方：等待对方完成后，从蓝点开始描每一笔。',
      },
      speak: '进入语言交换。绘画方先根据提示画图，画完点完成。学习方随后从蓝点开始，按顺序描红汉字。完成后可以听读音，也可以再来一轮。',
    },
    en: {
      eyebrow: 'Language Game',
      title: 'One draws, one learns',
      body: 'The drawing traveler follows the prompt. After done, the learning traveler starts from the blue dot and traces each stroke.',
      sideNotes: {
        left: 'Drawing traveler: draw the prompt first so your partner can guess and learn.',
        right: 'Learning traveler: wait for your partner, then trace each stroke from the blue dot.',
      },
      speak: 'You are now in the language game. The drawing traveler follows the prompt first and taps done. The learning traveler then starts from the blue dot and traces each stroke. At the end, listen to the pronunciation or play again.',
    },
    ja: {
      eyebrow: '言語ゲーム',
      title: '一人が描き、一人が学びます',
      body: '描く人がヒントに合わせて絵を描き、完了後、学ぶ人が青い点から順番になぞります。',
      sideNotes: {
        left: '描く人：先にヒントの言葉を絵で表し、相手が推測して学べるようにします。',
        right: '学ぶ人：相手が終わったら、青い点から一画ずつなぞってください。',
      },
      speak: '言語ゲームに入りました。描く人はヒントに合わせて先に絵を描き、終わったら完了を押します。学ぶ人はその後、青い点から順番に文字をなぞります。最後に発音を聞くか、もう一度遊べます。',
    },
    ko: {
      eyebrow: '언어 게임',
      title: '한 명은 그리고, 한 명은 배웁니다',
      body: '그리는 사람이 제시어를 보고 그림을 완성하면, 배우는 사람이 파란 점에서 시작해 획을 순서대로 따라 씁니다.',
      sideNotes: {
        left: '그리는 사람: 먼저 제시어를 그림으로 표현해 상대가 맞히고 배울 수 있게 하세요.',
        right: '배우는 사람: 상대가 끝나면 파란 점에서 시작해 한 획씩 따라 쓰세요.',
      },
      speak: '언어 게임에 들어왔습니다. 그리는 사람이 먼저 제시어를 보고 그림을 그리고 완료를 누릅니다. 배우는 사람은 그다음 파란 점에서 시작해 글자의 획을 순서대로 따라 씁니다. 마지막에는 발음을 듣거나 다시 할 수 있습니다.',
    },
    es: {
      eyebrow: 'Juego de idioma',
      title: 'Una persona dibuja, otra aprende',
      body: 'Quien dibuja sigue la pista. Después, quien aprende empieza desde el punto azul y traza cada trazo.',
      sideNotes: {
        left: 'Quien dibuja: dibuja primero la palabra para que tu compañero la adivine y aprenda.',
        right: 'Quien aprende: espera a tu compañero y luego traza cada trazo desde el punto azul.',
      },
      speak: 'Estás en el juego de idioma. Quien dibuja sigue primero la pista y toca listo. Quien aprende empieza desde el punto azul y traza cada trazo. Al final, pueden escuchar la pronunciación o jugar otra vez.',
    },
    fr: {
      eyebrow: 'Jeu de langue',
      title: "L'un dessine, l'autre apprend",
      body: "La personne qui dessine suit l'indice. Ensuite, la personne qui apprend part du point bleu et trace chaque trait.",
      sideNotes: {
        left: "Dessin : dessinez d'abord le mot pour que l'autre personne devine et apprenne.",
        right: "Apprentissage : attendez votre partenaire, puis tracez chaque trait depuis le point bleu.",
      },
      speak: "Vous êtes dans le jeu de langue. La personne qui dessine suit d'abord l'indice puis appuie sur terminé. La personne qui apprend commence ensuite au point bleu et trace chaque trait. À la fin, écoutez la prononciation ou rejouez.",
    },
    de: {
      eyebrow: 'Sprachspiel',
      title: 'Eine Person zeichnet, eine lernt',
      body: 'Die zeichnende Person folgt dem Hinweis. Danach beginnt die lernende Person am blauen Punkt und zeichnet jeden Strich nach.',
      sideNotes: {
        left: 'Zeichnen: Zeichne zuerst den Begriff, damit die andere Person raten und lernen kann.',
        right: 'Lernen: Warte auf die andere Person und zeichne dann jeden Strich ab dem blauen Punkt nach.',
      },
      speak: 'Du bist jetzt im Sprachspiel. Die zeichnende Person folgt zuerst dem Hinweis und tippt auf fertig. Die lernende Person beginnt danach am blauen Punkt und zeichnet jeden Strich nach. Am Ende könnt ihr die Aussprache hören oder noch einmal spielen.',
    },
    ar: {
      eyebrow: 'لعبة اللغة',
      title: 'شخص يرسم وشخص يتعلم',
      body: 'يرسم أحدكما حسب التلميح. بعد الانتهاء، يبدأ المتعلم من النقطة الزرقاء ويتتبع كل ضربة بالترتيب.',
      sideNotes: {
        left: 'الرسام: ارسم الكلمة أولا كي يخمنها شريكك ويتعلمها.',
        right: 'المتعلم: انتظر حتى ينتهي شريكك، ثم تتبع كل ضربة من النقطة الزرقاء.',
      },
      speak: 'أنت الآن في لعبة اللغة. يرسم الرسام التلميح أولا ثم يضغط تم. بعد ذلك يبدأ المتعلم من النقطة الزرقاء ويتتبع كل ضربة بالترتيب. في النهاية يمكنكما سماع النطق أو اللعب مرة أخرى.',
    },
  },
};

const getUiCopy = (lang) => UI_COPY[normalizeLang(lang)] || UI_COPY.en;

const getStepCopy = (stepId, lang) => {
  const normalized = normalizeLang(lang);
  if (stepId === 'solo') {
    const soloCopy = {
      zh: {
        eyebrow: '单人绘画',
        title: '使用整块屏幕自由绘画',
        body: '一个人使用整块画布创作。右侧工具栏可以选择颜色、画笔、橡皮、撤销和 AI 功能。',
        sideNotes: {
          left: '单人绘画模式：整块屏幕都可以绘画。',
          right: '单人绘画模式：使用右侧工具栏控制画笔和保存。',
        },
        speak: '进入单人绘画。你可以使用整块屏幕自由绘画。右侧工具栏可以选择颜色、画笔、橡皮、撤销、AI 增强和保存。',
      },
      en: {
        eyebrow: 'Solo Drawing',
        title: 'Draw freely on the full screen',
        body: 'One person uses the full canvas. Use the right toolbar for color, brush, eraser, undo, AI tools, and saving.',
        sideNotes: {
          left: 'Solo mode: the whole screen is available for drawing.',
          right: 'Solo mode: use the right toolbar to control drawing and saving.',
        },
        speak: 'You are now in solo drawing. Use the full screen to draw freely. The right toolbar controls color, brush, eraser, undo, AI enhancement, and saving.',
      },
    };
    return soloCopy[normalized] || soloCopy.en;
  }
  return COACH_COPY[stepId]?.[normalized] || COACH_COPY[stepId]?.en || COACH_COPY.home.en;
};

const getSideLang = (side, leftLanguage, rightLanguage) =>
  normalizeLang(side === 'left' ? leftLanguage : rightLanguage);

const markCoachSeen = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Some kiosk browsers disable storage; the coach still works for the session.
  }
};

const CoachPanel = ({
  side,
  copy,
  ui,
  lang,
  isActive,
  isSpeaking,
  speechSupported,
  onStart,
  onStop,
  onDismiss,
}) => {
  const startLabel = isActive
    ? ui.replay
    : speechSupported
      ? ui.start
      : ui.textStart;

  return (
    <section
      className={`voice-coach-card voice-coach-card-${side}`}
      aria-label={side === 'left' ? ui.leftAria : ui.rightAria}
      dir={isRTL(lang) ? 'rtl' : 'ltr'}
      lang={getSpeechLang(lang)}
    >
      <div className="voice-coach-topline">
        <span>{copy.eyebrow}</span>
        <span className={isSpeaking ? 'voice-coach-live is-speaking' : 'voice-coach-live'}>
          {isSpeaking ? ui.speaking : ui.idle}
        </span>
      </div>

      <h2 className="voice-coach-title">{copy.title}</h2>
      <p className="voice-coach-body">{copy.body}</p>
      <p className="voice-coach-side-note">{copy.sideNotes[side]}</p>

      {!speechSupported && (
        <p className="voice-coach-fallback">{ui.fallback}</p>
      )}

      <div className="voice-coach-actions">
        <button className="voice-coach-primary" onClick={() => onStart(side)}>
          {startLabel}
        </button>
        {isSpeaking && (
          <button className="voice-coach-secondary" onClick={() => onStop(side)}>
            {ui.stop}
          </button>
        )}
        <button className="voice-coach-secondary" onClick={() => onDismiss(side)}>
          {ui.dismiss}
        </button>
      </div>
    </section>
  );
};

export const VoiceCoach = () => {
  const { appState, leftLanguage, rightLanguage } = useAppStore();
  const sides = useMemo(() => (appState === 'solo-drawing' ? ['right'] : SIDES), [appState]);
  const initiallyVisible = useMemo(() => false, []);
  const [visibleBySide, setVisibleBySide] = useState({
    left: initiallyVisible,
    right: initiallyVisible,
  });
  const [activeBySide, setActiveBySide] = useState({ left: false, right: false });
  const [speakingBySide, setSpeakingBySide] = useState({ left: false, right: false });
  const [speechSupported] = useState(canUseSpeech);
  const speechTokenRef = useRef({ left: 0, right: 0 });
  const lastSpokenStepRef = useRef({ left: null, right: null });

  const stepId = useMemo(() => {
    if (appState === 'selecting') return 'selecting';
    if (appState === 'drawing') return 'drawing';
    if (appState === 'solo-drawing') return 'solo';
    if (appState === 'language-game') return 'language';
    return 'home';
  }, [appState]);

  const stopSideSpeech = useCallback((side) => {
    if (!speechSupported) return;
    speechTokenRef.current[side] += 1;
    stopAllSpeech(`voice-coach-${side}`);
    setSpeakingBySide((current) => ({ ...current, [side]: false }));
  }, [speechSupported]);

  const playStep = useCallback((nextStepId, side, force = false) => {
    if (!speechSupported) {
      setActiveBySide((current) => ({ ...current, [side]: true }));
      return;
    }

    const lang = getSideLang(side, leftLanguage, rightLanguage);
    const copy = getStepCopy(nextStepId, lang);
    const spokenKey = `${nextStepId}:${lang}`;
    if (!force && lastSpokenStepRef.current[side] === spokenKey) return;
    lastSpokenStepRef.current[side] = spokenKey;

    stopAllSpeech(`voice-coach-${side}`);

    const token = speechTokenRef.current[side] + 1;
    speechTokenRef.current[side] = token;
    setSpeakingBySide((current) => ({ ...current, [side]: true }));

    speakNaturally(copy.speak, getSpeechLang(lang), {
      channelId: `voice-coach-${side}`,
      pan: side === 'left' ? -1 : 1,
      instruction: 'Speak naturally, warmly, and clearly. Do not sound robotic.',
      onDone: () => {
        if (speechTokenRef.current[side] !== token) return;
        setSpeakingBySide((current) => ({ ...current, [side]: false }));
      },
    });
  }, [leftLanguage, rightLanguage, speechSupported]);

  const handleStart = useCallback((side) => {
    setActiveBySide((current) => ({ ...current, [side]: true }));
    playStep(stepId, side, true);
  }, [playStep, stepId]);

  const handleDismiss = useCallback((side) => {
    stopSideSpeech(side);
    setActiveBySide((current) => ({ ...current, [side]: false }));
    setVisibleBySide((current) => {
      const next = { ...current, [side]: false };
      if (!next.left && !next.right) markCoachSeen();
      return next;
    });
  }, [stopSideSpeech]);

  const handleOpen = useCallback((side) => {
    setVisibleBySide((current) => ({ ...current, [side]: true }));
    setActiveBySide((current) => ({ ...current, [side]: false }));
    lastSpokenStepRef.current[side] = null;
  }, []);

  useEffect(() => {
    sides.forEach((side) => {
      if (visibleBySide[side] && activeBySide[side]) {
        playStep(stepId, side);
      }
    });
  }, [activeBySide, playStep, sides, stepId, visibleBySide]);

  useEffect(() => {
    if (appState !== 'solo-drawing') return;
    stopSideSpeech('left');
    setVisibleBySide((current) => ({ ...current, left: false }));
    setActiveBySide((current) => ({ ...current, left: false }));
  }, [appState, stopSideSpeech]);

  useEffect(() => () => stopAllSpeech(), []);

  const hiddenSides = sides.filter((side) => !visibleBySide[side]);
  const visibleSides = sides.filter((side) => visibleBySide[side]);

  const renderLauncher = (side) => {
    const lang = getSideLang(side, leftLanguage, rightLanguage);
    const ui = getUiCopy(lang);

    return (
      <button
        key={side}
        className={`voice-coach-launcher voice-coach-launcher-${side}`}
        onClick={() => handleOpen(side)}
        aria-label={side === 'left' ? ui.leftAria : ui.rightAria}
        dir={isRTL(lang) ? 'rtl' : 'ltr'}
      >
        {ui.launcher}
      </button>
    );
  };

  return (
    <>
      {hiddenSides.length > 0 && (
        <div className="voice-coach-launchers" aria-label={getUiCopy(rightLanguage || 'en').entry}>
          {hiddenSides.map(renderLauncher)}
        </div>
      )}

      {visibleSides.length > 0 && (
        <div className="voice-coach-overlay" role="dialog" aria-modal="false">
          {visibleSides.map((side) => {
            const lang = getSideLang(side, leftLanguage, rightLanguage);
            const ui = getUiCopy(lang);
            const copy = getStepCopy(stepId, lang);

            return (
              <CoachPanel
                key={side}
                side={side}
                copy={copy}
                ui={ui}
                lang={lang}
                isActive={activeBySide[side]}
                isSpeaking={speakingBySide[side]}
                speechSupported={speechSupported}
                onStart={handleStart}
                onStop={stopSideSpeech}
                onDismiss={handleDismiss}
              />
            );
          })}
        </div>
      )}
    </>
  );
};

export default VoiceCoach;
