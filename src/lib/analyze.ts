export function analyzePrompt(prompt: string) {
  const issues:string[] = [];
  const suggestions:string[] = [];

  const mustHave = [
    { key: 'semantic', rx: /semantic|aria|a11y|accessible/i, tip: 'ระบุให้ใช้ semantic HTML + WAI-ARIA + keyboard focus' },
    { key: 'cwv', rx: /LCP|CLS|INP|Core Web Vitals/i, tip: 'กำหนดเป้าหมาย CWV ชัด ๆ เช่น LCP<2.5s, CLS<0.1, INP<200ms' },
    { key: 'privacy', rx: /privacy|consent|PDPA|PII/i, tip: 'ระบุ Privacy (ไม่เก็บ PII โดยไม่จำเป็น, แสดง cookie consent)' },
    { key: 'security', rx: /security|xss|csp|headers|sanitize/i, tip: 'ระบุข้อห้าม security (no inline handlers, sanitize input, security headers/CSP)' },
    { key: 'performance', rx: /lazy|optimize|bundle|ssr|stream/i, tip: 'ขอ SSR/Streaming/lazy-loading ลด JS ฝั่ง client' },
  ];

  mustHave.forEach(m => {
    if (!m.rx.test(prompt)) suggestions.push(`ควรเพิ่มประเด็น: ${m.tip}`);
  });

  if (!/alt\s?text|alt-text|alt attribute/i.test(prompt)) {
    suggestions.push('เพิ่ม: ใส่ alt text กับรูปทั้งหมด');
  }
  if (!/contrast|WCAG|AA/i.test(prompt)) {
    suggestions.push('เพิ่ม: กำหนด contrast ตาม WCAG 2.1 AA');
  }
  if (/tracking|analytics/i.test(prompt) && !/consent/i.test(prompt)) {
    issues.push('มี analytics/tracking แต่ไม่มีคำสั่งขอ consent');
  }

  return { issues, suggestions };
}
