# NEXT_STEP — UI Demo

เดโม UI วางเส้นทางเข้ามหาวิทยาลัย (TCAS) ต่อกับฐานข้อมูล Supabase จริง

## วิธีรัน

ต้องเปิดผ่าน **web server** (อย่าเปิดไฟล์ `index.html` ตรงๆ ด้วย `file://` เพราะบางเบราว์เซอร์จะบล็อกการโหลด JS/เรียก API)

วิธีง่ายสุด — เปิด terminal ที่โฟลเดอร์นี้แล้วรัน:

```bash
# ถ้ามี Python
python3 -m http.server 5173

# หรือถ้ามี Node
npx serve .
```

แล้วเปิดเบราว์เซอร์ไปที่ `http://localhost:5173`

## โครงสร้าง

```
nextstep-demo/
├── index.html        # 6 หน้าในไฟล์เดียว สลับด้วย JS
├── css/styles.css    # ธีมเข้ม + จุดกริด + เขียวมะนาว
└── js/
    ├── config.js     # URL + key ของ Supabase
    └── app.js        # ลอจิก flow + query ข้อมูล
```

## Flow ทั้ง 6 หน้า

1. **สร้าง path** — กล่อง path (แก้ชื่อได้) + ปุ่มเพิ่ม path
2. **ตั้งชื่อ path** — ตอนกดเพิ่ม
3. **เรียนอยู่สายอะไร** — แกนกลาง (วิทย์–คณิต / ศิลป์) หรือ อาชีวะ (ปวช.) → กรองหลักสูตรด้วยคอลัมน์ `accepts_sci_math` / `accepts_arts` / `accepts_vocational`
4. **เลือกคณะ → รายการหลักสูตร** — โชว์คณะที่รับสายนั้น, กดเข้าไปเห็นหลักสูตร + โลโก้มหาลัย + ค่าเทอม (NULL = "ไม่ระบุ"), มีปุ่มกรวยเรียงตามค่าเทอม/ชื่อ/ภูมิภาค
5. **Let me cook!** — โหลดระหว่างสร้าง roadmap
6. **Road map** — รอบ TCAS 1–4 (จาก `program_admission_rounds`) + ไทม์ไลน์สิ่งที่ควรทำ (จาก `program_roadmaps`)

ข้อมูล path ที่สร้างถูกเก็บใน `localStorage` ของเบราว์เซอร์ (เดโม) ส่วนข้อมูลมหาลัย/หลักสูตร/ค่าเทอม/roadmap ดึงสดจาก Supabase

## ⚠️ ก่อน deploy จริง (สำคัญ)

ตอนนี้ **Row Level Security (RLS) ปิดอยู่ทั้ง 8 ตาราง** และ key ใน `config.js` เป็น public anon key — แปลว่าใครก็ตามที่เปิดเว็บนี้สามารถอ่าน (และเขียน) **ทุกตาราง** รวมถึง `users_profile` ที่มีข้อมูลส่วนตัว (ชื่อ, โรงเรียน, GPA)

สำหรับเดโมที่อ่านเฉพาะข้อมูลหลักสูตร/มหาลัยใช้ได้ปกติ แต่ **ก่อนเปิดสู่สาธารณะ** ควร:
- เปิด RLS แล้วตั้ง policy ให้ตารางแคตตาล็อก (`programs`, `universities`, `faculties`, `program_roadmaps`, `program_admission_rounds`, `careers`, `program_career_junction`) อ่านได้แบบ public
- จำกัด `users_profile` / `user_preferences` ให้แต่ละคนเห็นเฉพาะข้อมูลตัวเอง (`auth.uid() = id`)

(ทักได้ถ้าอยากให้ช่วยร่าง policy ชุดนี้ให้)
