// Test Google Translate API directly
async function testGoogleTranslate() {
  try {
    const text = "kesi h";
    const sl = "hi";
    const tl = "en";
    
    const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
    console.log("Testing Google Translate API:", gUrl);
    
    const response = await fetch(gUrl);
    const data = await response.json();
    
    console.log("Response:", data);
    
    const translated = Array.isArray(data?.[0])
      ? data[0].map((chunk) => chunk?.[0]).filter(Boolean).join('')
      : '';
    
    const translatedText = (translated || '').trim();
    console.log("Translated text:", translatedText);
    
  } catch (error) {
    console.error("Google Translate test failed:", error);
  }
}

testGoogleTranslate();
