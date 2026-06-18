import React, { useRef, useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode.react';
import { useAppStore } from '@/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { isHardCornerShape } from '@/utils/shapeDetection';
import { displayPair, isRTL, normalizeLang } from '@/utils/language';
import '../styles/Canvas.css';

const ROOM_ID = 'layover-main';
const API_BASE = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : '';

const CATEGORY_COPY = {
  zh: {
    object: '常见物体',
    animal: '动物',
    person: '人物',
    building: '建筑',
    vehicle: '交通工具',
    scene: '场景',
    symbol: '符号',
    emotion: '情绪',
    abstract: '抽象',
    mixed: '组合场景',
    unknown: '未知',
  },
  en: {
    object: 'Object',
    animal: 'Animal',
    person: 'Person',
    building: 'Building',
    vehicle: 'Vehicle',
    scene: 'Scene',
    symbol: 'Symbol',
    emotion: 'Emotion',
    abstract: 'Abstract',
    mixed: 'Mixed scene',
    unknown: 'Unknown',
  },
  ja: {
    object: '物',
    animal: '動物',
    person: '人物',
    building: '建物',
    vehicle: '乗り物',
    scene: '場面',
    symbol: '記号',
    emotion: '感情',
    abstract: '抽象',
    mixed: '組み合わせ',
    unknown: '不明',
  },
  ko: {
    object: '사물',
    animal: '동물',
    person: '사람',
    building: '건물',
    vehicle: '교통수단',
    scene: '장면',
    symbol: '기호',
    emotion: '감정',
    abstract: '추상',
    mixed: '복합 장면',
    unknown: '알 수 없음',
  },
  es: {
    object: 'Objeto',
    animal: 'Animal',
    person: 'Persona',
    building: 'Edificio',
    vehicle: 'Vehículo',
    scene: 'Escena',
    symbol: 'Símbolo',
    emotion: 'Emoción',
    abstract: 'Abstracto',
    mixed: 'Escena mixta',
    unknown: 'Desconocido',
  },
  fr: {
    object: 'Objet',
    animal: 'Animal',
    person: 'Personne',
    building: 'Bâtiment',
    vehicle: 'Véhicule',
    scene: 'Scène',
    symbol: 'Symbole',
    emotion: 'Émotion',
    abstract: 'Abstrait',
    mixed: 'Scène mixte',
    unknown: 'Inconnu',
  },
  de: {
    object: 'Objekt',
    animal: 'Tier',
    person: 'Person',
    building: 'Gebäude',
    vehicle: 'Fahrzeug',
    scene: 'Szene',
    symbol: 'Symbol',
    emotion: 'Emotion',
    abstract: 'Abstrakt',
    mixed: 'Gemischte Szene',
    unknown: 'Unbekannt',
  },
  ar: {
    object: 'شيء',
    animal: 'حيوان',
    person: 'شخص',
    building: 'مبنى',
    vehicle: 'مركبة',
    scene: 'مشهد',
    symbol: 'رمز',
    emotion: 'شعور',
    abstract: 'تجريدي',
    mixed: 'مشهد مركب',
    unknown: 'غير معروف',
  },
};

const CANVAS_COPY = {
  zh: {
    locale: 'zh',
    styleSection: '风格化',
    styleMeta: 'Style',
    shapeSection: '图形整理',
    shapeMeta: 'Shape',
    snapShape: '转为图形',
    shapeHint: '识别最近一笔并整理为几何形状',
    recognizeSection: 'AI 识别',
    recognizeMeta: 'Recognize',
    recognizeButton: '识别画作',
    recognizing: '识别中…',
    recognitionHint: 'AI 识别这幅合作画像什么',
    completeSection: '语义补全',
    completeMeta: 'Complete',
    completeButton: '补全缺失部分',
    completing: '补全中…',
    voiceSection: '语音修改',
    voiceMeta: 'Voice Edit',
    voicePlaceholder: '改成蓝色 / 加星星',
    listen: '语音',
    listening: '聆听中…',
    execute: '执行',
    editing: '修改中…',
    ideasSection: '灵感',
    ideasMeta: 'Ideas',
    ideaButton: '给我灵感',
    generateSection: 'AI 生图',
    generateMeta: 'Generate',
    generateButton: '生成手绘候选',
    generating: '生成中…',
    generateHint: '保留手绘线条，从多张 AI 图里挑风格',
    aiEnhanceSection: 'AI 增强',
    enhanceSketch: 'AI 增强',
    enhancing: '增强中…',
    colorFill: '填色',
    coloring: '填色中…',
    storySection: '小故事',
    storyButton: '讲个小故事',
    storyLoading: '讲故事中…',
    storyTitle: '画里的故事',
    simpleEnhanceHint: '保留手画的稚拙感，只轻轻美化或上色',
    hidePreview: '隐藏预览',
    noGenerated: '没有生成可用图像',
    generationFailed: '生成失败，请稍后再试',
    storyFailed: '故事生成失败，请稍后再试',
    aiBusy: 'AI 图片服务正忙，请稍后再试',
    localFallback: 'AI 图片服务正忙，已先显示本地预览',
    completionFailed: '补全失败，请稍后再试',
    voiceEditFailed: '语音修改失败，请稍后再试',
    speechUnsupported: '当前浏览器不支持语音识别，可以直接输入指令',
    speechMissed: '没有听清楚，可以再说一次或直接输入',
    saveFailed: '保存失败',
    clickToClose: '点击关闭',
    pronunciation: '发音',
    connected: '已连接',
    disconnected: '未连接',
    size: '大小',
    opacity: '透明度',
    tools: { pen: '钢笔', brush: '画笔', eraser: '橡皮', undo: '撤销', redo: '重做', clear: '清除', ai: 'AI 增强', finish: '完成绘画', home: '返回主页', restart: '重新开始' },
    shareTitle: '扫码保存到手机',
    shareSub: '保存这张共创作品',
    close: '关闭',
    categories: CATEGORY_COPY.zh,
  },
  en: {
    locale: 'en',
    styleSection: 'Style',
    styleMeta: 'Filters',
    shapeSection: 'Shape cleanup',
    shapeMeta: 'Shape',
    snapShape: 'Snap shape',
    shapeHint: 'Recognize the last stroke and tidy it into a geometric shape',
    recognizeSection: 'AI recognition',
    recognizeMeta: 'Recognize',
    recognizeButton: 'Recognize drawing',
    recognizing: 'Recognizing…',
    recognitionHint: 'AI reads what the shared drawing may be',
    completeSection: 'Semantic completion',
    completeMeta: 'Complete',
    completeButton: 'Complete missing parts',
    completing: 'Completing…',
    voiceSection: 'Voice edit',
    voiceMeta: 'Voice Edit',
    voicePlaceholder: 'make it blue / add stars',
    listen: 'Voice',
    listening: 'Listening…',
    execute: 'Apply',
    editing: 'Editing…',
    ideasSection: 'Ideas',
    ideasMeta: 'Inspiration',
    ideaButton: 'Give me an idea',
    generateSection: 'AI image',
    generateMeta: 'Generate',
    generateButton: 'Generate hand-drawn options',
    generating: 'Generating…',
    generateHint: 'Keep the sketch lines and choose from AI style options',
    aiEnhanceSection: 'AI enhance',
    enhanceSketch: 'AI enhance',
    enhancing: 'Enhancing…',
    colorFill: 'Color fill',
    coloring: 'Coloring…',
    storySection: 'Story',
    storyButton: 'Tell a story',
    storyLoading: 'Writing…',
    storyTitle: 'Tiny story',
    simpleEnhanceHint: 'Keep the naive hand-drawn charm; only gently polish or color it',
    hidePreview: 'Hide preview',
    noGenerated: 'No usable image was generated',
    generationFailed: 'Generation failed. Try again in a moment',
    storyFailed: 'Story failed. Try again in a moment',
    aiBusy: 'The AI image service is busy. Try again in a moment',
    localFallback: 'AI image service is busy; showing a local preview for now',
    completionFailed: 'Completion failed. Try again in a moment',
    voiceEditFailed: 'Voice edit failed. Try again in a moment',
    speechUnsupported: 'This browser does not support speech recognition. You can type instead',
    speechMissed: 'I did not catch that. Try again or type the command',
    saveFailed: 'Save failed',
    clickToClose: 'Tap to close',
    pronunciation: 'Speak',
    connected: 'Connected',
    disconnected: 'Disconnected',
    size: 'Size',
    opacity: 'Opacity',
    tools: { pen: 'Pen', brush: 'Brush', eraser: 'Eraser', undo: 'Undo', redo: 'Redo', clear: 'Clear', ai: 'AI enhance', finish: 'Finish drawing', home: 'Home', restart: 'Restart' },
    shareTitle: 'Scan to save',
    shareSub: 'Save this drawing to your phone',
    close: 'Close',
    categories: CATEGORY_COPY.en,
  },
  ja: {
    locale: 'ja',
    styleSection: 'スタイル',
    styleMeta: 'Style',
    shapeSection: '図形整理',
    shapeMeta: 'Shape',
    snapShape: '図形に整える',
    shapeHint: '直近の線を認識して幾何形に整えます',
    recognizeSection: 'AI 認識',
    recognizeMeta: 'Recognize',
    recognizeButton: '絵を認識',
    recognizing: '認識中…',
    recognitionHint: 'AI が共同の絵を読み取ります',
    completeSection: '意味補完',
    completeMeta: 'Complete',
    completeButton: '足りない部分を補完',
    completing: '補完中…',
    voiceSection: '音声編集',
    voiceMeta: 'Voice Edit',
    voicePlaceholder: '青くして / 星を足して',
    listen: '音声',
    listening: '聞き取り中…',
    execute: '実行',
    editing: '編集中…',
    ideasSection: 'アイデア',
    ideasMeta: 'Ideas',
    ideaButton: 'アイデアを出す',
    generateSection: 'AI 画像',
    generateMeta: 'Generate',
    generateButton: '手描き候補を生成',
    generating: '生成中…',
    generateHint: '手描き線を残して AI の候補から選びます',
    aiEnhanceSection: 'AI 強化',
    enhanceSketch: 'AI 強化',
    enhancing: '強化中…',
    colorFill: '色を塗る',
    coloring: '色塗り中…',
    storySection: '小さな物語',
    storyButton: '物語を作る',
    storyLoading: '作成中…',
    storyTitle: '絵の中の物語',
    simpleEnhanceHint: '手描きの素朴さを残し、少しだけ整えたり色を付けます',
    hidePreview: 'プレビューを隠す',
    noGenerated: '使える画像が生成されませんでした',
    generationFailed: '生成に失敗しました。少し後でもう一度お試しください',
    storyFailed: '物語の生成に失敗しました。少し後でもう一度お試しください',
    aiBusy: 'AI 画像サービスが混み合っています。少し後でもう一度お試しください',
    localFallback: 'AI 画像サービスが混み合っているため、ローカルプレビューを表示しています',
    completionFailed: '補完に失敗しました。少し後でもう一度お試しください',
    voiceEditFailed: '音声編集に失敗しました。少し後でもう一度お試しください',
    speechUnsupported: 'このブラウザは音声認識に対応していません。入力してください',
    speechMissed: '聞き取れませんでした。もう一度話すか入力してください',
    saveFailed: '保存に失敗しました',
    clickToClose: 'タップして閉じる',
    pronunciation: '発音',
    connected: '接続済み',
    disconnected: '未接続',
    size: 'サイズ',
    opacity: '透明度',
    tools: { pen: 'ペン', brush: 'ブラシ', eraser: '消しゴム', undo: '戻す', redo: 'やり直し', clear: '消去', ai: 'AI 強化', finish: '完了', home: 'ホーム', restart: '再開' },
    shareTitle: 'スキャンして保存',
    shareSub: 'スマートフォンに保存',
    close: '閉じる',
    categories: CATEGORY_COPY.ja,
  },
  ko: {
    locale: 'ko',
    styleSection: '스타일',
    styleMeta: 'Style',
    shapeSection: '도형 정리',
    shapeMeta: 'Shape',
    snapShape: '도형으로 정리',
    shapeHint: '마지막 선을 인식해 도형으로 정리합니다',
    recognizeSection: 'AI 인식',
    recognizeMeta: 'Recognize',
    recognizeButton: '그림 인식',
    recognizing: '인식 중…',
    recognitionHint: 'AI가 함께 그린 그림을 읽습니다',
    completeSection: '의미 보완',
    completeMeta: 'Complete',
    completeButton: '빠진 부분 보완',
    completing: '보완 중…',
    voiceSection: '음성 편집',
    voiceMeta: 'Voice Edit',
    voicePlaceholder: '파란색으로 / 별 추가',
    listen: '음성',
    listening: '듣는 중…',
    execute: '실행',
    editing: '편집 중…',
    ideasSection: '아이디어',
    ideasMeta: 'Ideas',
    ideaButton: '아이디어 받기',
    generateSection: 'AI 이미지',
    generateMeta: 'Generate',
    generateButton: '손그림 후보 생성',
    generating: '생성 중…',
    generateHint: '손그림 선을 유지하고 AI 스타일 후보를 고르세요',
    aiEnhanceSection: 'AI 보정',
    enhanceSketch: 'AI 보정',
    enhancing: '보정 중…',
    colorFill: '색칠하기',
    coloring: '색칠 중…',
    storySection: '작은 이야기',
    storyButton: '이야기 만들기',
    storyLoading: '쓰는 중…',
    storyTitle: '그림 속 이야기',
    simpleEnhanceHint: '서툰 손그림 느낌은 살리고 살짝 다듬거나 색을 입힙니다',
    hidePreview: '미리보기 숨기기',
    noGenerated: '사용 가능한 이미지가 없습니다',
    generationFailed: '생성 실패. 잠시 후 다시 시도하세요',
    storyFailed: '이야기 생성 실패. 잠시 후 다시 시도하세요',
    aiBusy: 'AI 이미지 서비스가 바쁩니다. 잠시 후 다시 시도하세요',
    localFallback: 'AI 이미지 서비스가 바빠서 우선 로컬 미리보기를 표시합니다',
    completionFailed: '보완 실패. 잠시 후 다시 시도하세요',
    voiceEditFailed: '음성 편집 실패. 잠시 후 다시 시도하세요',
    speechUnsupported: '이 브라우저는 음성 인식을 지원하지 않습니다. 직접 입력하세요',
    speechMissed: '잘 듣지 못했습니다. 다시 말하거나 입력하세요',
    saveFailed: '저장 실패',
    clickToClose: '탭해서 닫기',
    pronunciation: '발음',
    connected: '연결됨',
    disconnected: '연결 안 됨',
    size: '크기',
    opacity: '투명도',
    tools: { pen: '펜', brush: '브러시', eraser: '지우개', undo: '실행 취소', redo: '다시 실행', clear: '지우기', ai: 'AI 보정', finish: '완료', home: '홈', restart: '다시 시작' },
    shareTitle: '스캔해서 저장',
    shareSub: '휴대폰에 저장',
    close: '닫기',
    categories: CATEGORY_COPY.ko,
  },
  es: {
    locale: 'es',
    styleSection: 'Estilo',
    styleMeta: 'Style',
    shapeSection: 'Ajustar forma',
    shapeMeta: 'Shape',
    snapShape: 'Convertir forma',
    shapeHint: 'Reconoce el último trazo y lo ordena como forma geométrica',
    recognizeSection: 'Reconocimiento AI',
    recognizeMeta: 'Recognize',
    recognizeButton: 'Reconocer dibujo',
    recognizing: 'Reconociendo…',
    recognitionHint: 'AI interpreta el dibujo compartido',
    completeSection: 'Completar sentido',
    completeMeta: 'Complete',
    completeButton: 'Completar partes',
    completing: 'Completando…',
    voiceSection: 'Edición por voz',
    voiceMeta: 'Voice Edit',
    voicePlaceholder: 'hazlo azul / agrega estrellas',
    listen: 'Voz',
    listening: 'Escuchando…',
    execute: 'Aplicar',
    editing: 'Editando…',
    ideasSection: 'Ideas',
    ideasMeta: 'Ideas',
    ideaButton: 'Dame una idea',
    generateSection: 'Imagen AI',
    generateMeta: 'Generate',
    generateButton: 'Generar opciones',
    generating: 'Generando…',
    generateHint: 'Conserva los trazos y elige opciones de estilo AI',
    aiEnhanceSection: 'Mejora AI',
    enhanceSketch: 'Mejorar',
    enhancing: 'Mejorando…',
    colorFill: 'Colorear',
    coloring: 'Coloreando…',
    storySection: 'Historia',
    storyButton: 'Contar historia',
    storyLoading: 'Escribiendo…',
    storyTitle: 'Historia del dibujo',
    simpleEnhanceHint: 'Mantiene el encanto torpe del dibujo y solo lo mejora o colorea suavemente',
    hidePreview: 'Ocultar vista',
    noGenerated: 'No se generó una imagen usable',
    generationFailed: 'Falló la generación. Inténtalo de nuevo en un momento',
    storyFailed: 'Falló la historia. Inténtalo de nuevo en un momento',
    aiBusy: 'El servicio de imagen AI está ocupado. Inténtalo de nuevo en un momento',
    localFallback: 'El servicio de imagen AI está ocupado; se muestra una vista local',
    completionFailed: 'Falló completar. Inténtalo de nuevo en un momento',
    voiceEditFailed: 'Falló la edición por voz. Inténtalo de nuevo en un momento',
    speechUnsupported: 'Este navegador no admite reconocimiento de voz. Puedes escribir',
    speechMissed: 'No lo entendí. Intenta otra vez o escribe',
    saveFailed: 'No se pudo guardar',
    clickToClose: 'Toca para cerrar',
    pronunciation: 'Pronunciar',
    connected: 'Conectado',
    disconnected: 'Sin conexión',
    size: 'Tamaño',
    opacity: 'Opacidad',
    tools: { pen: 'Pluma', brush: 'Pincel', eraser: 'Borrador', undo: 'Deshacer', redo: 'Rehacer', clear: 'Limpiar', ai: 'Mejora AI', finish: 'Terminar', home: 'Inicio', restart: 'Reiniciar' },
    shareTitle: 'Escanea para guardar',
    shareSub: 'Guarda este dibujo en tu teléfono',
    close: 'Cerrar',
    categories: CATEGORY_COPY.es,
  },
  fr: {
    locale: 'fr',
    styleSection: 'Style',
    styleMeta: 'Style',
    shapeSection: 'Forme',
    shapeMeta: 'Shape',
    snapShape: 'Nettoyer la forme',
    shapeHint: 'Reconnaît le dernier trait et le transforme en forme géométrique',
    recognizeSection: 'Reconnaissance AI',
    recognizeMeta: 'Recognize',
    recognizeButton: 'Reconnaître le dessin',
    recognizing: 'Reconnaissance…',
    recognitionHint: 'AI lit ce que le dessin partagé peut représenter',
    completeSection: 'Complétion',
    completeMeta: 'Complete',
    completeButton: 'Compléter les manques',
    completing: 'Complétion…',
    voiceSection: 'Édition vocale',
    voiceMeta: 'Voice Edit',
    voicePlaceholder: 'mets-le en bleu / ajoute des étoiles',
    listen: 'Voix',
    listening: 'Écoute…',
    execute: 'Appliquer',
    editing: 'Modification…',
    ideasSection: 'Idées',
    ideasMeta: 'Ideas',
    ideaButton: 'Donne une idée',
    generateSection: 'Image AI',
    generateMeta: 'Generate',
    generateButton: 'Générer des options',
    generating: 'Génération…',
    generateHint: 'Gardez les traits et choisissez une option de style AI',
    aiEnhanceSection: 'Amélioration AI',
    enhanceSketch: 'Améliorer',
    enhancing: 'Amélioration…',
    colorFill: 'Colorier',
    coloring: 'Coloration…',
    storySection: 'Histoire',
    storyButton: 'Raconter',
    storyLoading: 'Écriture…',
    storyTitle: 'Petite histoire',
    simpleEnhanceHint: 'Garde le charme maladroit du dessin et l’améliore ou le colore doucement',
    hidePreview: 'Masquer',
    noGenerated: 'Aucune image utilisable générée',
    generationFailed: 'Échec de génération. Réessayez dans un instant',
    storyFailed: 'Échec de l’histoire. Réessayez dans un instant',
    aiBusy: 'Le service d’image AI est occupé. Réessayez dans un instant',
    localFallback: 'Le service d’image AI est occupé ; aperçu local affiché',
    completionFailed: 'Échec de complétion. Réessayez dans un instant',
    voiceEditFailed: 'Échec de l’édition vocale. Réessayez dans un instant',
    speechUnsupported: 'Ce navigateur ne prend pas la reconnaissance vocale en charge. Vous pouvez taper',
    speechMissed: 'Je n’ai pas compris. Réessayez ou tapez',
    saveFailed: 'Échec de sauvegarde',
    clickToClose: 'Toucher pour fermer',
    pronunciation: 'Prononcer',
    connected: 'Connecté',
    disconnected: 'Déconnecté',
    size: 'Taille',
    opacity: 'Opacité',
    tools: { pen: 'Stylo', brush: 'Pinceau', eraser: 'Gomme', undo: 'Annuler', redo: 'Rétablir', clear: 'Effacer', ai: 'Amélioration AI', finish: 'Terminer', home: 'Accueil', restart: 'Recommencer' },
    shareTitle: 'Scanner pour sauvegarder',
    shareSub: 'Enregistrez le dessin sur votre téléphone',
    close: 'Fermer',
    categories: CATEGORY_COPY.fr,
  },
  de: {
    locale: 'de',
    styleSection: 'Stil',
    styleMeta: 'Style',
    shapeSection: 'Form ordnen',
    shapeMeta: 'Shape',
    snapShape: 'Form glätten',
    shapeHint: 'Erkennt den letzten Strich und ordnet ihn als geometrische Form',
    recognizeSection: 'AI-Erkennung',
    recognizeMeta: 'Recognize',
    recognizeButton: 'Bild erkennen',
    recognizing: 'Erkennung…',
    recognitionHint: 'AI liest, was die gemeinsame Zeichnung sein könnte',
    completeSection: 'Semantisch ergänzen',
    completeMeta: 'Complete',
    completeButton: 'Fehlendes ergänzen',
    completing: 'Ergänze…',
    voiceSection: 'Sprachbearbeitung',
    voiceMeta: 'Voice Edit',
    voicePlaceholder: 'mach es blau / Sterne hinzufügen',
    listen: 'Sprache',
    listening: 'Höre zu…',
    execute: 'Anwenden',
    editing: 'Bearbeite…',
    ideasSection: 'Ideen',
    ideasMeta: 'Ideas',
    ideaButton: 'Idee geben',
    generateSection: 'AI-Bild',
    generateMeta: 'Generate',
    generateButton: 'Optionen erzeugen',
    generating: 'Erzeuge…',
    generateHint: 'Skizzenlinien behalten und AI-Stiloptionen wählen',
    aiEnhanceSection: 'AI-Verbesserung',
    enhanceSketch: 'Verbessern',
    enhancing: 'Verbessere…',
    colorFill: 'Ausmalen',
    coloring: 'Male aus…',
    storySection: 'Geschichte',
    storyButton: 'Geschichte erzählen',
    storyLoading: 'Schreibe…',
    storyTitle: 'Kleine Geschichte',
    simpleEnhanceHint: 'Behält den naiven Handzeichen-Charme und verbessert oder färbt nur sanft',
    hidePreview: 'Vorschau ausblenden',
    noGenerated: 'Kein nutzbares Bild erzeugt',
    generationFailed: 'Generierung fehlgeschlagen. Bitte gleich erneut versuchen',
    storyFailed: 'Geschichte fehlgeschlagen. Bitte gleich erneut versuchen',
    aiBusy: 'Der AI-Bilddienst ist ausgelastet. Bitte gleich erneut versuchen',
    localFallback: 'Der AI-Bilddienst ist ausgelastet; lokale Vorschau wird angezeigt',
    completionFailed: 'Ergänzung fehlgeschlagen. Bitte gleich erneut versuchen',
    voiceEditFailed: 'Sprachbearbeitung fehlgeschlagen. Bitte gleich erneut versuchen',
    speechUnsupported: 'Dieser Browser unterstützt keine Spracherkennung. Bitte tippen',
    speechMissed: 'Nicht verstanden. Noch einmal sprechen oder tippen',
    saveFailed: 'Speichern fehlgeschlagen',
    clickToClose: 'Tippen zum Schließen',
    pronunciation: 'Anhören',
    connected: 'Verbunden',
    disconnected: 'Getrennt',
    size: 'Größe',
    opacity: 'Deckkraft',
    tools: { pen: 'Stift', brush: 'Pinsel', eraser: 'Radierer', undo: 'Rückgängig', redo: 'Wiederholen', clear: 'Löschen', ai: 'AI-Verbesserung', finish: 'Fertig', home: 'Start', restart: 'Neustart' },
    shareTitle: 'Zum Speichern scannen',
    shareSub: 'Zeichnung auf dem Handy speichern',
    close: 'Schließen',
    categories: CATEGORY_COPY.de,
  },
  ar: {
    locale: 'ar',
    styleSection: 'النمط',
    styleMeta: 'Style',
    shapeSection: 'ترتيب الشكل',
    shapeMeta: 'Shape',
    snapShape: 'حوّل إلى شكل',
    shapeHint: 'يتعرف على آخر خط وينظمه كشكل هندسي',
    recognizeSection: 'تعرف AI',
    recognizeMeta: 'Recognize',
    recognizeButton: 'تعرف على الرسم',
    recognizing: 'جار التعرف…',
    recognitionHint: 'AI يقرأ ما قد يمثله الرسم المشترك',
    completeSection: 'إكمال المعنى',
    completeMeta: 'Complete',
    completeButton: 'أكمل الأجزاء الناقصة',
    completing: 'جار الإكمال…',
    voiceSection: 'تعديل بالصوت',
    voiceMeta: 'Voice Edit',
    voicePlaceholder: 'اجعله أزرق / أضف نجوما',
    listen: 'صوت',
    listening: 'أستمع…',
    execute: 'تطبيق',
    editing: 'جار التعديل…',
    ideasSection: 'أفكار',
    ideasMeta: 'Ideas',
    ideaButton: 'أعطني فكرة',
    generateSection: 'صورة AI',
    generateMeta: 'Generate',
    generateButton: 'أنشئ خيارات مرسومة',
    generating: 'جار الإنشاء…',
    generateHint: 'احتفظ بخطوط الرسم واختر من أنماط AI',
    aiEnhanceSection: 'تحسين AI',
    enhanceSketch: 'تحسين',
    enhancing: 'جار التحسين…',
    colorFill: 'تلوين',
    coloring: 'جار التلوين…',
    storySection: 'قصة',
    storyButton: 'احك قصة',
    storyLoading: 'جار الكتابة…',
    storyTitle: 'قصة الرسم',
    simpleEnhanceHint: 'يحافظ على عفوية الرسم اليدوي ويضيف تحسينًا أو تلوينًا خفيفًا',
    hidePreview: 'إخفاء المعاينة',
    noGenerated: 'لم يتم إنشاء صورة صالحة',
    generationFailed: 'فشل الإنشاء. حاول مرة أخرى بعد قليل',
    storyFailed: 'فشل إنشاء القصة. حاول مرة أخرى بعد قليل',
    aiBusy: 'خدمة صور AI مشغولة الآن. حاول مرة أخرى بعد قليل',
    localFallback: 'خدمة صور AI مشغولة الآن؛ يتم عرض معاينة محلية مؤقتة',
    completionFailed: 'فشل الإكمال. حاول مرة أخرى بعد قليل',
    voiceEditFailed: 'فشل تعديل الصوت. حاول مرة أخرى بعد قليل',
    speechUnsupported: 'هذا المتصفح لا يدعم التعرف على الصوت. يمكنك الكتابة',
    speechMissed: 'لم أفهم. حاول مرة أخرى أو اكتب الأمر',
    saveFailed: 'فشل الحفظ',
    clickToClose: 'اضغط للإغلاق',
    pronunciation: 'نطق',
    connected: 'متصل',
    disconnected: 'غير متصل',
    size: 'الحجم',
    opacity: 'الشفافية',
    tools: { pen: 'قلم', brush: 'فرشاة', eraser: 'ممحاة', undo: 'تراجع', redo: 'إعادة', clear: 'مسح', ai: 'تحسين AI', finish: 'إنهاء', home: 'الرئيسية', restart: 'إعادة' },
    shareTitle: 'امسح للحفظ',
    shareSub: 'احفظ الرسم على هاتفك',
    close: 'إغلاق',
    categories: CATEGORY_COPY.ar,
  },
};

const getCanvasCopy = (lang) => CANVAS_COPY[normalizeLang(lang)] || CANVAS_COPY.en;
const getOptionTitle = (option, lang, copy) => {
  if (!option) return '';
  const normalizedLang = normalizeLang(lang);
  const localizedTitle = option.localized?.[normalizedLang]?.title;
  if (localizedTitle) return localizedTitle;
  if (String(option.id || '').startsWith('ai-color')) return copy.colorFill;
  if (String(option.id || '').startsWith('ai-enhance')) return copy.enhanceSketch;
  return displayPair(option.zh, option.en || option.title, lang) || option.title || copy.enhanceSketch;
};
const getDisplayLanguages = (leftLanguage, rightLanguage) =>
  [leftLanguage, rightLanguage].map(lang => normalizeLang(lang)).filter(Boolean);
const getStoryText = (story, lang) => {
  if (!story) return '';
  const normalizedLang = normalizeLang(lang);
  return story.localized?.[normalizedLang]?.story
    || displayPair(story.storyZh, story.storyEn, lang)
    || story.story
    || '';
};
const getStoryTitle = (story, lang, fallback = '') => {
  if (!story) return fallback;
  const normalizedLang = normalizeLang(lang);
  return story.localized?.[normalizedLang]?.title
    || displayPair(story.titleZh, story.titleEn, lang)
    || story.title
    || fallback;
};
const buildDrawingMetadata = ({ type = 'co', selectedGenerated, storyResult, leftLanguage, rightLanguage, rightCopy, primaryCopy }) => {
  const generatedTitle = selectedGenerated
    ? getOptionTitle(selectedGenerated, rightLanguage, rightCopy)
    : '';
  const storyTitle = getStoryTitle(storyResult, rightLanguage, primaryCopy.storyTitle);

  return {
    type: type === 'solo' ? 'solo' : 'co',
    source: selectedGenerated ? 'ai-generated' : 'canvas',
    title: generatedTitle || storyTitle || primaryCopy.shareSub,
    story: storyResult || null,
    generated: selectedGenerated
      ? {
          id: selectedGenerated.id,
          title: generatedTitle || selectedGenerated.title || '',
          provider: selectedGenerated.provider || '',
          model: selectedGenerated.model || '',
        }
      : null,
    languages: getDisplayLanguages(leftLanguage, rightLanguage),
  };
};
const getAIErrorMessage = (payload, fallback, copy) => {
  const raw = String(payload?.error || payload?.message || '').trim();
  if (payload?.code === 'stepfun_overloaded' || /overload|temporar|busy|try again|timeout/i.test(raw)) {
    return copy.aiBusy || fallback;
  }
  return raw || fallback;
};
const isAIServiceBusy = (payload) => {
  const raw = String(payload?.error || payload?.message || '').trim();
  return payload?.code === 'stepfun_overloaded' || /overload|temporar|busy|try again|timeout/i.test(raw);
};

const loadImageDataUrl = (imageData) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = imageData;
});

const createLocalEnhancedOption = async (imageData, mode, copy) => {
  const img = await loadImageDataUrl(imageData);
  const tmp = document.createElement('canvas');
  tmp.width = img.naturalWidth || img.width;
  tmp.height = img.naturalHeight || img.height;
  const ctx = tmp.getContext('2d');

  ctx.fillStyle = '#f7fbfa';
  ctx.fillRect(0, 0, tmp.width, tmp.height);

  if (mode === 'color') {
    const gradient = ctx.createLinearGradient(0, 0, tmp.width, tmp.height);
    gradient.addColorStop(0, 'rgba(255, 201, 118, 0.42)');
    gradient.addColorStop(0.45, 'rgba(111, 207, 211, 0.34)');
    gradient.addColorStop(1, 'rgba(255, 134, 163, 0.36)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = 'contrast(1.1) saturate(1.12)';
    ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
  } else {
    ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
    ctx.globalAlpha = 0.28;
    ctx.filter = 'blur(0.45px) contrast(1.25)';
    ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
    ctx.globalAlpha = 1;
    ctx.filter = 'contrast(1.08) saturate(1.06)';
    ctx.drawImage(img, 0, 0, tmp.width, tmp.height);
  }

  return {
    id: `local-${mode}-${Date.now()}`,
    zh: mode === 'color' ? '本地填色' : '本地增强',
    en: mode === 'color' ? 'Local color' : 'Local enhance',
    title: mode === 'color' ? copy.colorFill : copy.enhanceSketch,
    imageData: tmp.toDataURL('image/png'),
    provider: 'local-fallback',
  };
};

const exportArtworkWithPaper = (canvas, fullCanvas = false) => {
  if (fullCanvas) {
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tc = tmp.getContext('2d');
    tc.fillStyle = '#f7fbfa';
    tc.fillRect(0, 0, tmp.width, tmp.height);
    tc.drawImage(canvas, 0, 0);
    return tmp.toDataURL('image/png');
  }

  const half = Math.floor(canvas.width / 2);
  const tmp = document.createElement('canvas');
  tmp.width = half;
  tmp.height = canvas.height;
  const tc = tmp.getContext('2d');
  tc.fillStyle = '#f7fbfa';
  tc.fillRect(0, 0, tmp.width, tmp.height);
  tc.drawImage(canvas, half, 0, half, canvas.height, 0, 0, half, canvas.height);
  return tmp.toDataURL('image/png');
};

// ── Canvas drawing helpers ─────────────────────────────────────────────────────
const hexToRgba = (hex, alpha) => {
  if (!hex || hex.length < 7) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const mirrorPoints = (points, W, H) =>
  points.map(([px, py]) => [W - px, H - py]);

const setStyle = (ctx, tool, color, size, opacity) => {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size;
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.fillStyle   = 'rgba(0,0,0,1)';
  } else if (tool === 'brush') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = hexToRgba(color, (opacity / 100) * 0.45);
    ctx.fillStyle   = ctx.strokeStyle;
    ctx.shadowBlur  = size * 1.2;
    ctx.shadowColor = color;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = hexToRgba(color, opacity / 100);
    ctx.fillStyle   = ctx.strokeStyle;
  }
};

const drawHalf = (ctx, side, tool, color, size, opacity, points, W, H, shapeType = 'freehand') => {
  if (!points || points.length === 0) return;
  const half = W / 2;
  ctx.save();
  ctx.beginPath();
  side === 'left' ? ctx.rect(0, 0, half, H) : ctx.rect(half, 0, half, H);
  ctx.clip();
  setStyle(ctx, tool, color, size, opacity);

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0][0], points[0][1], size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (isHardCornerShape(shapeType)) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2;
      const my = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1], mx, my);
    }
    ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
    ctx.stroke();
  }
  ctx.restore();
};

const drawFull = (ctx, tool, color, size, opacity, points, shapeType = 'freehand') => {
  if (!points || points.length === 0) return;
  ctx.save();
  setStyle(ctx, tool, color, size, opacity);

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0][0], points[0][1], size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (isHardCornerShape(shapeType)) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2;
      const my = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1], mx, my);
    }
    ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
    ctx.stroke();
  }
  ctx.restore();
};

const applyStroke = (ctx, stroke, W, H, mirrored = true) => {
  const { side, tool, color, size, opacity, points, shapeType } = stroke;
  if (!mirrored) {
    drawFull(ctx, tool, color, size, opacity, points, shapeType);
    return;
  }
  drawHalf(ctx, side, tool, color, size, opacity, points, W, H, shapeType);
  const oppSide = side === 'left' ? 'right' : 'left';
  drawHalf(ctx, oppSide, tool, color, size, opacity, mirrorPoints(points, W, H), W, H, shapeType);
};

const applySegment = (ctx, side, tool, color, size, opacity, from, to, W, H, mirrored = true) => {
  const half = W / 2;
  const draw = (s, f, t) => {
    ctx.save();
    ctx.beginPath();
    s === 'left' ? ctx.rect(0, 0, half, H) : ctx.rect(half, 0, half, H);
    ctx.clip();
    setStyle(ctx, tool, color, size, opacity);
    ctx.beginPath();
    ctx.moveTo(f[0], f[1]);
    ctx.lineTo(t[0], t[1]);
    ctx.stroke();
    ctx.restore();
  };
  if (!mirrored) {
    ctx.save();
    setStyle(ctx, tool, color, size, opacity);
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.stroke();
    ctx.restore();
    return;
  }
  draw(side, from, to);
  draw(side === 'left' ? 'right' : 'left', [W - from[0], H - from[1]], [W - to[0], H - to[1]]);
};

// ── AI Panel ──────────────────────────────────────────────────────────────────
const AIPanel = ({
  side,
  onEnhance,
  isEnhancing,
  enhanceMode,
  onTellStory,
  isStoryLoading,
  storyResult,
  generatedStyles,
  selectedGeneratedId,
  onSelectGeneratedStyle,
  onClearGeneratedStyle,
  generationError,
  copy,
  lang,
}) => {
  const storyText = getStoryText(storyResult, lang);
  const polishLoading = isEnhancing && enhanceMode === 'polish';
  const colorLoading = isEnhancing && enhanceMode === 'color';

  return (
  <div
    className={`ai-panel ${side === 'left' ? 'ai-panel-left' : 'ai-panel-right'}`}
    dir={isRTL(lang) ? 'rtl' : 'ltr'}
    lang={lang}
  >
    <div className="ai-section-label">{copy.aiEnhanceSection}</div>
    <p className="ai-hint ai-panel-intro">{copy.simpleEnhanceHint}</p>
    <div className="ai-action-grid">
    <button
        className={`ai-generate-btn ${polishLoading ? 'loading' : ''}`}
        onClick={() => onEnhance('polish')}
        disabled={isEnhancing}
    >
        {polishLoading ? <span className="ai-recog-dots">{copy.enhancing}</span> : copy.enhanceSketch}
    </button>
    <button
        className={`ai-secondary-btn ${colorLoading ? 'loading' : ''}`}
        onClick={() => onEnhance('color')}
        disabled={isEnhancing}
    >
        {colorLoading ? copy.coloring : copy.colorFill}
    </button>
    </div>

    {generationError && (
      <div className="ai-gen-error">{generationError}</div>
    )}

    {generatedStyles.length > 0 && (
      <div className="ai-variant-grid">
        {generatedStyles.map(option => (
          <button
            key={option.id}
            className={`ai-variant-option ${selectedGeneratedId === option.id ? 'active' : ''}`}
            onClick={() => onSelectGeneratedStyle(option)}
            title={option.title}
          >
            <img src={option.imageData} alt={option.title} />
            <span>{getOptionTitle(option, lang, copy)}</span>
          </button>
        ))}
      </div>
    )}

    {selectedGeneratedId && (
      <button className="ai-clear-preview-btn" onClick={onClearGeneratedStyle}>
        {copy.hidePreview}
      </button>
    )}

    <div className="ai-divider" />
    <div className="ai-section-label">{copy.storySection}</div>
    <button
      className={`ai-secondary-btn ai-wide-btn ${isStoryLoading ? 'loading' : ''}`}
      onClick={onTellStory}
      disabled={isStoryLoading}
    >
      {isStoryLoading ? copy.storyLoading : copy.storyButton}
    </button>
    {storyText && (
      <div className="ai-story-card">
        <strong>{copy.storyTitle}</strong>
        <span>{storyText}</span>
      </div>
    )}
  </div>
  );
};

// ── Toolbar ───────────────────────────────────────────────────────────────────
const Toolbar = ({
  side, color, setColor, tool, setTool, size, setSize, opacity, setOpacity,
  onUndo, onRedo, onClear, onRestart, onAI, aiOpen, onFinish, isSaving,
  copy, lang,
}) => {
  const colorInputRef = useRef(null);
  const [recent, setRecent] = useState([]);
  const applyColor = (c) => {
    setColor(c);
    setRecent(prev => [c, ...prev.filter(x => x !== c)].slice(0, 4));
  };
  return (
    <div
      className={`pro-panel ${side === 'left' ? 'pro-panel-left' : 'pro-panel-right'}`}
      dir={isRTL(lang) ? 'rtl' : 'ltr'}
      lang={lang}
    >
      <div className="pro-swatch" style={{ background: color }}
        onClick={() => colorInputRef.current?.click()} />
      <input ref={colorInputRef} type="color" value={color}
        onChange={e => applyColor(e.target.value)} className="pro-color-input" />
      <div className="pro-recents">
        {recent.map((c, i) => (
          <div key={i} className={`pro-recent ${color === c ? 'sel' : ''}`}
            style={{ background: c }} onClick={() => setColor(c)} />
        ))}
      </div>
      <div className="pro-sep" />
      {[{ id: 'pen', label: copy.tools.pen, icon: '✒' },
        { id: 'brush', label: copy.tools.brush, icon: '○' },
        { id: 'eraser', label: copy.tools.eraser, icon: '◻' }].map(t => (
        <button key={t.id} className={`pro-tool ${tool === t.id ? 'active' : ''}`}
          onClick={() => setTool(t.id)} title={t.label}>{t.icon}</button>
      ))}
      <div className="pro-sep" />
      <div className="pro-slider-wrap">
        <span className="pro-label">{copy.size}</span>
        <div className="pro-track">
          <input type="range" min="1" max="60" value={size}
            onChange={e => setSize(+e.target.value)} className="pro-range" />
        </div>
        <span className="pro-val">{size}</span>
      </div>
      <div className="pro-slider-wrap">
        <span className="pro-label">{copy.opacity}</span>
        <div className="pro-track">
          <input type="range" min="5" max="100" value={opacity}
            onChange={e => setOpacity(+e.target.value)} className="pro-range" />
        </div>
        <span className="pro-val">{opacity}%</span>
      </div>
      <div className="pro-sep" />
      <div className="pro-row">
        <button className="pro-btn" onClick={onUndo} title={copy.tools.undo}>↺</button>
        <button className="pro-btn" onClick={onRedo} title={copy.tools.redo}>↻</button>
      </div>
      <button className="pro-btn pro-clear" onClick={onClear} title={copy.tools.clear}>🗑</button>
      <div className="pro-sep" />
      <button className={`pro-btn pro-ai ${aiOpen ? 'active' : ''}`} onClick={onAI} title={copy.tools.ai}>✦</button>
      <button
        className={`pro-btn pro-finish ${isSaving ? 'is-loading' : ''}`}
        onClick={onFinish}
        disabled={isSaving}
        title={copy.tools.finish}
      >{isSaving ? '…' : '✓'}</button>
      <button className="pro-btn pro-restart" onClick={onRestart} title={copy.tools.restart}>⟳</button>
    </div>
  );
};

// ── Main canvas component ─────────────────────────────────────────────────────
export const DrawingCanvas = ({ mode = 'co' }) => {
  const isSolo = mode === 'solo';
  const canvasRef  = useRef(null);
  const ctxRef     = useRef(null);
  const activeDraws = useRef(new Map());
  const allStrokes = useRef([]);
  const leftRedo   = useRef([]);
  const rightRedo  = useRef([]);
  const soloRedo   = useRef([]);
  const remoteLive = useRef({});

  const { userId, setAppState, leftLanguage, rightLanguage } = useAppStore();
  const { emit, on, off, isConnected } = useWebSocket();
  const leftCopy = getCanvasCopy(leftLanguage);
  const rightCopy = getCanvasCopy(rightLanguage);
  const primaryCopy = rightCopy || leftCopy || CANVAS_COPY.en;
  const soloCopy = primaryCopy;

  const [aColor, setAColor] = useState('#1d84b5');
  const [aTool,  setATool]  = useState('pen');
  const [aSize,  setASize]  = useState(6);
  const [aOpacity, setAOpacity] = useState(100);

  const [bColor, setBColor] = useState('#e63946');
  const [bTool,  setBTool]  = useState('pen');
  const [bSize,  setBSize]  = useState(6);
  const [bOpacity, setBOpacity] = useState(100);

  const [canvasFilter,     setCanvasFilter]     = useState('none');
  const [leftAIOpen,       setLeftAIOpen]       = useState(false);
  const [rightAIOpen,      setRightAIOpen]      = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceMode, setEnhanceMode] = useState(null);
  const [generatedStyles,    setGeneratedStyles]    = useState([]);
  const [selectedGenerated,  setSelectedGenerated]  = useState(null);
  const [generationError,    setGenerationError]    = useState(null);
  const [storyResult, setStoryResult] = useState(null);
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  const [isSaving,     setIsSaving]     = useState(false);
  const [shareInfo,    setShareInfo]    = useState(null); // { url } when QR modal open
  const [saveError,    setSaveError]    = useState(null);

  // stable refs for WebSocket closure
  const setFilterRef = useRef(setCanvasFilter);
  useEffect(() => { setFilterRef.current = setCanvasFilter; });
  const setSelectedGeneratedRef = useRef(setSelectedGenerated);
  useEffect(() => { setSelectedGeneratedRef.current = setSelectedGenerated; });

  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas.parentElement;
    canvas.width  = c.clientWidth;
    canvas.height = c.clientHeight;
    ctxRef.current = canvas.getContext('2d');
  }, []);

  useEffect(() => {
    if (isSolo) return;
    if (isConnected) emit('joinRoom', ROOM_ID, () => {});
  }, [isSolo, isConnected, emit]);

  const redrawAll = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allStrokes.current.forEach(s => applyStroke(ctx, s, canvas.width, canvas.height, !isSolo));
  }, [isSolo]);

  // Remote events
  useEffect(() => {
    if (isSolo) return undefined;
    const onRemoteStroke = ({ stroke, userId: rid }) => {
      if (rid === userId) return;
      const canvas = canvasRef.current;
      applyStroke(ctxRef.current, stroke, canvas.width, canvas.height);
      allStrokes.current.push({ ...stroke, remote: true });
    };

    const onRemotePoint = ({ userId: rid, strokeId, meta, points }) => {
      if (rid === userId) return;
      const canvas = canvasRef.current;
      const newPt  = points[points.length - 1];
      const live   = remoteLive.current[strokeId];
      const prevPt = live?.lastPt ?? (points.length >= 2 ? points[points.length - 2] : null);
      if (prevPt) {
        applySegment(ctxRef.current, meta.side, meta.tool, meta.color, meta.size, meta.opacity,
          prevPt, newPt, canvas.width, canvas.height);
      }
      remoteLive.current[strokeId] = { ...meta, lastPt: newPt };
    };

    const onRemoteAction = ({ type, side, strokeId, filter, option }) => {
      if (type === 'undo') {
        const strokes = allStrokes.current;
        let idx = strokeId
          ? strokes.findIndex(s => s.id === strokeId)
          : strokes.map((s, i) => ({ s, i })).filter(({ s }) => s.side === side).pop()?.i ?? -1;
        if (idx >= 0) { strokes.splice(idx, 1); redrawAll(); }
      } else if (type === 'clear') {
        allStrokes.current = allStrokes.current.filter(s => s.side !== side);
        redrawAll();
      } else if (type === 'style') {
        setFilterRef.current(filter ?? 'none');
      } else if (type === 'generatedImageSelected') {
        setSelectedGeneratedRef.current(option || null);
      }
    };

    on('remoteStroke',      onRemoteStroke);
    on('remoteStrokePoint', onRemotePoint);
    on('remoteAction',      onRemoteAction);
    return () => {
      off('remoteStroke',      onRemoteStroke);
      off('remoteStrokePoint', onRemotePoint);
      off('remoteAction',      onRemoteAction);
    };
  }, [isSolo, on, off, userId, redrawAll]);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const rawX   = (e.clientX - rect.left) * (canvas.width / rect.width);
    const rawY   = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (isSolo) {
      return {
        x: Math.max(0, Math.min(rawX, canvas.width - 1)),
        y: Math.max(0, Math.min(rawY, canvas.height - 1)),
        side: 'solo',
      };
    }
    const half   = canvas.width / 2;
    const side   = rawX < half ? 'left' : 'right';
    const y      = Math.max(0, Math.min(rawY, canvas.height - 1));
    const x = side === 'left' ? Math.min(rawX, half - 1) : Math.max(rawX, half + 1);
    return { x, y, side };
  }, [isSolo]);

  const handleStart = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const { x, y, side } = getPos(e);
    const color   = isSolo || side === 'right' ? aColor   : bColor;
    const tool    = isSolo || side === 'right' ? aTool    : bTool;
    const size    = isSolo || side === 'right' ? aSize    : bSize;
    const opacity = isSolo || side === 'right' ? aOpacity : bOpacity;

    const strokeId = `${userId}-${e.pointerId}-${Date.now()}`;
    const stroke   = { id: strokeId, side, tool, color, size, opacity, points: [[x, y]], ts: Date.now() };
    activeDraws.current.set(e.pointerId, { side, stroke });
    if (side === 'left') leftRedo.current = [];
    else if (side === 'right') rightRedo.current = [];
    else soloRedo.current = [];

    const canvas = canvasRef.current;
    const ctx    = ctxRef.current;
    const W = canvas.width, H = canvas.height;
    const drawDot = (s, cx, cy, mirrored = true) => {
      if (!mirrored) {
        ctx.save();
        setStyle(ctx, tool, color, size, opacity);
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      const half = W / 2;
      ctx.save();
      ctx.beginPath();
      s === 'left' ? ctx.rect(0, 0, half, H) : ctx.rect(half, 0, half, H);
      ctx.clip();
      setStyle(ctx, tool, color, size, opacity);
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawDot(side, x, y, !isSolo);
    if (!isSolo) drawDot(side === 'left' ? 'right' : 'left', W - x, H - y);
  }, [isSolo, aColor, aTool, aSize, aOpacity, bColor, bTool, bSize, bOpacity, getPos, userId]);

  const handleMove = useCallback((e) => {
    e.preventDefault();
    const active = activeDraws.current.get(e.pointerId);
    if (!active) return;
    const { x, y, side } = getPos(e);
    if (side !== active.side) return;

    const { stroke } = active;
    const canvas = canvasRef.current;
    const prev = stroke.points[stroke.points.length - 1];
    applySegment(ctxRef.current, stroke.side, stroke.tool, stroke.color, stroke.size, stroke.opacity,
      prev, [x, y], canvas.width, canvas.height, !isSolo);
    stroke.points.push([x, y]);

    if (!isSolo && stroke.points.length % 4 === 0) {
      emit('strokePoint', {
        roomId: ROOM_ID, userId,
        strokeId: stroke.id,
        meta: { side: stroke.side, tool: stroke.tool, color: stroke.color, size: stroke.size, opacity: stroke.opacity },
        points: stroke.points.slice(-5),
      });
    }
  }, [isSolo, getPos, emit, userId]);

  const handleEnd = useCallback((e) => {
    e?.preventDefault?.();
    if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const active = activeDraws.current.get(e.pointerId);
    if (!active) return;
    const { stroke } = active;
    allStrokes.current.push(stroke);
    activeDraws.current.delete(e.pointerId);
    if (!isSolo) emit('canvasStroke', { roomId: ROOM_ID, userId, stroke });
    delete remoteLive.current[stroke.id];
    setGenerationError(null);
    setStoryResult(null);
  }, [isSolo, emit, userId]);

  const undoSide = useCallback((side) => {
    const strokes = allStrokes.current;
    let idx = strokes.length - 1;
    while (idx >= 0 && (strokes[idx].side !== side || strokes[idx].remote)) idx--;
    if (idx < 0) return;
    const [removed] = strokes.splice(idx, 1);
    if (side === 'left') leftRedo.current.push(removed);
    else if (side === 'right') rightRedo.current.push(removed);
    else soloRedo.current.push(removed);
    redrawAll();
    if (!isSolo) emit('canvasAction', { roomId: ROOM_ID, userId, type: 'undo', side, strokeId: removed.id });
  }, [isSolo, redrawAll, emit, userId]);

  const redoSide = useCallback((side) => {
    const stack = side === 'left' ? leftRedo : side === 'right' ? rightRedo : soloRedo;
    if (!stack.current.length) return;
    const stroke = stack.current.pop();
    const strokes = allStrokes.current;
    let i = strokes.length;
    while (i > 0 && strokes[i - 1].ts > stroke.ts) i--;
    strokes.splice(i, 0, stroke);
    redrawAll();
  }, [redrawAll]);

  const clearSide = useCallback((side) => {
    allStrokes.current = allStrokes.current.filter(s => s.side !== side || s.remote);
    if (side === 'left') leftRedo.current = [];
    else if (side === 'right') rightRedo.current = [];
    else soloRedo.current = [];
    redrawAll();
    if (!isSolo) emit('canvasAction', { roomId: ROOM_ID, userId, type: 'clear', side });
  }, [isSolo, redrawAll, emit, userId]);

  // ── Simple AI enhancement actions ───────────────────────────────────────────
  const addGeneratedOption = useCallback((option) => {
    if (!option) return;
    setGeneratedStyles(prev => [option, ...prev.filter(item => item.id !== option.id)].slice(0, 8));
    setSelectedGenerated(option);
    if (!isSolo) emit('canvasAction', { roomId: ROOM_ID, userId, type: 'generatedImageSelected', option });
  }, [isSolo, emit, userId]);

  const runAIEnhance = useCallback(async (mode = 'polish') => {
    if (isEnhancing) return;
    setIsEnhancing(true);
    setEnhanceMode(mode);
    setGenerationError(null);
    const imageData = exportArtworkWithPaper(canvasRef.current, isSolo);

    try {
      const res = await fetch(`${API_BASE}/api/ai-enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          mode,
          displayLanguages: getDisplayLanguages(leftLanguage, rightLanguage),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(payload.error || `HTTP ${res.status}`);
        error.payload = payload;
        throw error;
      }

      const option = payload.option || payload.options?.[0];
      if (!option?.imageData) {
        setGenerationError(primaryCopy.noGenerated);
        return;
      }
      addGeneratedOption(option);
      setStoryResult(null);
    } catch (err) {
      console.error('AI enhancement failed:', err);
      if (isAIServiceBusy(err.payload)) {
        try {
          const fallbackOption = await createLocalEnhancedOption(imageData, mode, primaryCopy);
          addGeneratedOption(fallbackOption);
          setStoryResult(null);
          setGenerationError(null);
        } catch {
          setGenerationError(primaryCopy.aiBusy || primaryCopy.generationFailed);
        }
      } else {
        setGenerationError(getAIErrorMessage(err.payload, primaryCopy.generationFailed, primaryCopy));
      }
    } finally {
      setIsEnhancing(false);
      setEnhanceMode(null);
    }
  }, [isSolo, isEnhancing, addGeneratedOption, primaryCopy, leftLanguage, rightLanguage]);

  const tellSketchStory = useCallback(async () => {
    if (isStoryLoading) return;
    setIsStoryLoading(true);
    setGenerationError(null);
    try {
      const imageData = exportArtworkWithPaper(canvasRef.current, isSolo);
      const res = await fetch(`${API_BASE}/api/ai-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          displayLanguages: getDisplayLanguages(leftLanguage, rightLanguage),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(payload.error || `HTTP ${res.status}`);
        error.payload = payload;
        throw error;
      }
      setStoryResult(payload);
    } catch (err) {
      console.error('Sketch story failed:', err);
      setGenerationError(getAIErrorMessage(err.payload, primaryCopy.storyFailed, primaryCopy));
    } finally {
      setIsStoryLoading(false);
    }
  }, [isSolo, isStoryLoading, primaryCopy, leftLanguage, rightLanguage]);

  const selectGeneratedStyle = useCallback((option) => {
    setSelectedGenerated(option);
    setStoryResult(null);
    if (!isSolo) emit('canvasAction', { roomId: ROOM_ID, userId, type: 'generatedImageSelected', option });
  }, [isSolo, emit, userId]);

  const clearGeneratedPreview = useCallback(() => {
    setSelectedGenerated(null);
    setStoryResult(null);
    if (!isSolo) emit('canvasAction', { roomId: ROOM_ID, userId, type: 'generatedImageSelected', option: null });
  }, [isSolo, emit, userId]);

  const handleRestart = () => {
    allStrokes.current = [];
    leftRedo.current   = [];
    rightRedo.current  = [];
    soloRedo.current   = [];
    setCanvasFilter('none');
    setIsEnhancing(false);
    setEnhanceMode(null);
    setGeneratedStyles([]);
    setSelectedGenerated(null);
    setGenerationError(null);
    setStoryResult(null);
    setIsStoryLoading(false);
    setAppState(isSolo ? 'home' : 'selecting');
  };

  const handleFinishDrawing = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const imageData = selectedGenerated?.imageData
        || exportArtworkWithPaper(canvasRef.current, isSolo);
      const metadata = buildDrawingMetadata({
        type: isSolo ? 'solo' : 'co',
        selectedGenerated,
        storyResult,
        leftLanguage,
        rightLanguage,
        rightCopy,
        primaryCopy,
      });
      const res = await fetch(`${API_BASE}/api/drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, metadata }),
      });
      const payload = await res.json().catch(() => ({}));
      const shareUrl = payload.mobileUrl || payload.url;
      if (!res.ok || !shareUrl) throw new Error(payload.error || `HTTP ${res.status}`);
      setShareInfo({ url: shareUrl });
    } catch (err) {
      console.error('Save drawing failed:', err);
      setSaveError(err?.message || primaryCopy.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }, [isSolo, isSaving, selectedGenerated, storyResult, leftLanguage, rightLanguage, rightCopy, primaryCopy]);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        style={{ filter: canvasFilter !== 'none' ? canvasFilter : undefined }}
        onPointerDown={handleStart}
        onPointerMove={handleMove}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
      />

      {!isSolo && <div className="canvas-center-line" />}

      {selectedGenerated && (
        <div className="ai-generated-preview">
          <img src={selectedGenerated.imageData} alt={selectedGenerated.title || 'AI generated drawing'} />
          <div className="ai-generated-caption">
            <span>{getOptionTitle(selectedGenerated, rightLanguage || leftLanguage, soloCopy)}</span>
          </div>
        </div>
      )}

      {!isSolo && (
      <div className={`canvas-conn ${isConnected ? 'conn-ok' : 'conn-off'}`}>
        {isConnected ? `● ${primaryCopy.connected}` : `○ ${primaryCopy.disconnected}`}
      </div>
      )}

      {!isSolo && (
      <button
        className="canvas-home-btn canvas-home-btn-left"
        onClick={() => setAppState('home')}
        title={leftCopy.tools.home}
      >⌂</button>
      )}
      <button
        className="canvas-home-btn canvas-home-btn-right"
        onClick={() => setAppState('home')}
        title={soloCopy.tools.home}
      >⌂</button>

      {!isSolo && (
      <Toolbar side="left"
        color={bColor} setColor={setBColor} tool={bTool} setTool={setBTool}
        size={bSize} setSize={setBSize} opacity={bOpacity} setOpacity={setBOpacity}
        onUndo={() => undoSide('left')} onRedo={() => redoSide('left')}
        onClear={() => clearSide('left')} onRestart={handleRestart}
        onAI={() => setLeftAIOpen(v => !v)} aiOpen={leftAIOpen}
        onFinish={handleFinishDrawing} isSaving={isSaving}
        copy={leftCopy} lang={leftLanguage || 'en'} />
      )}

      <Toolbar side="right"
        color={aColor} setColor={setAColor} tool={aTool} setTool={setATool}
        size={aSize} setSize={setASize} opacity={aOpacity} setOpacity={setAOpacity}
        onUndo={() => undoSide(isSolo ? 'solo' : 'right')} onRedo={() => redoSide(isSolo ? 'solo' : 'right')}
        onClear={() => clearSide(isSolo ? 'solo' : 'right')} onRestart={handleRestart}
        onAI={() => setRightAIOpen(v => !v)} aiOpen={rightAIOpen}
        onFinish={handleFinishDrawing} isSaving={isSaving}
        copy={soloCopy} lang={(rightLanguage || leftLanguage) || 'en'} />

      {!isSolo && leftAIOpen && (
        <AIPanel side="left"
          onEnhance={runAIEnhance}
          isEnhancing={isEnhancing}
          enhanceMode={enhanceMode}
          onTellStory={tellSketchStory}
          isStoryLoading={isStoryLoading}
          storyResult={storyResult}
          generatedStyles={generatedStyles}
          selectedGeneratedId={selectedGenerated?.id}
          onSelectGeneratedStyle={selectGeneratedStyle}
          onClearGeneratedStyle={clearGeneratedPreview}
          generationError={generationError}
          copy={leftCopy}
          lang={leftLanguage || 'en'} />
      )}
      {rightAIOpen && (
        <AIPanel side="right"
          onEnhance={runAIEnhance}
          isEnhancing={isEnhancing}
          enhanceMode={enhanceMode}
          onTellStory={tellSketchStory}
          isStoryLoading={isStoryLoading}
          storyResult={storyResult}
          generatedStyles={generatedStyles}
          selectedGeneratedId={selectedGenerated?.id}
          onSelectGeneratedStyle={selectGeneratedStyle}
          onClearGeneratedStyle={clearGeneratedPreview}
          generationError={generationError}
          copy={soloCopy}
          lang={(rightLanguage || leftLanguage) || 'en'} />
      )}

      {saveError && (
        <div className="save-error-toast" onClick={() => setSaveError(null)}>
          {saveError} · {primaryCopy.clickToClose}
        </div>
      )}

      {shareInfo && (
        <div className="qr-modal" role="dialog" onClick={() => setShareInfo(null)}>
          {!isSolo && <ShareCard side="left" url={shareInfo.url} onClose={() => setShareInfo(null)} copy={leftCopy} lang={leftLanguage || 'en'} />}
          <ShareCard side="right" url={shareInfo.url} onClose={() => setShareInfo(null)} copy={soloCopy} lang={(rightLanguage || leftLanguage) || 'en'} />
        </div>
      )}
    </div>
  );
};

const ShareCard = ({ side, url, onClose, copy, lang }) => (
  <div
    className={`qr-card qr-card-${side}`}
    onClick={(e) => e.stopPropagation()}
    dir={isRTL(lang) ? 'rtl' : 'ltr'}
    lang={lang}
  >
    <div className="qr-card-title">{copy.shareTitle}</div>
    <div className="qr-card-sub">{copy.shareSub}</div>
    <div className="qr-code-frame">
      <QRCode value={url} size={208} level="M" />
    </div>
    <div className="qr-url" title={url}>{url}</div>
    <button className="qr-close" onClick={onClose}>{copy.close}</button>
  </div>
);

export default DrawingCanvas;

