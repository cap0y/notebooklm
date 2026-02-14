git remote add origin https://github.com/cap0y/notebooklm.git; git push -u origin main


퍼블리싱 (배포) 방법
이 프로젝트는 Express 서버 + React + PostgreSQL 구조이므로, GitHub Pages는 사용할 수 없고 아래 방법 중 하나를 선택하시면 됩니다:
✅ 추천: Render (무료 가능)
https://render.com 접속 → GitHub 계정으로 로그인
Dashboard → New + → Web Service
GitHub 연결 → cap0y/notebooklm 선택
설정:
항목	값
Name	notebooklm
Runtime	Node
Build Command	npm install && npm run build
Start Command	npm start
Environment Variables 추가:
Key	Value
DATABASE_URL	postgresql://사용자:비밀번호@호스트:5432/DB명
NODE_ENV	production


이 프로젝트는 Express 서버 + React 프론트엔드 + PostgreSQL 구조이므로, 아래 플랫폼 중 하나를 추천합니다:
✅ 방법 A: Render (무료 가능, 추천)
https://render.com 가입 (GitHub 계정으로)
Dashboard → New → Web Service
GitHub 저장소 aihanguledit 연결
설정:
항목	값
Name	aihanguledit
Runtime	Node
Build Command	npm install && npm run build
Start Command	npm start
Environment Variables 추가:
Key	Value
DATABASE_URL	PostgreSQL 연결 URL
NODE_ENV	production
PostgreSQL이 필요하면 Render에서 New → PostgreSQL 로 무료 DB도 만들 수 있음
Create Web Service 클릭 → 자동 빌드 & 배포
✅ 방법 B: Railway (간편, 소규모 무료)
https://railway.app 가입
New Project → Deploy from GitHub repo
저장소 선택 후 자동 감지
PostgreSQL 추가: New → Database → PostgreSQL
환경변수 DATABASE_URL이 자동 연결됨
Deploy 클릭

 참고
Free 플랜 PostgreSQL은 90일 후 만료됩니다 (다시 만들면 됨)
Free Web Service는 15분 동안 트래픽 없으면 슬립 모드 → 첫 접속 시 30초 정도 걸림
이미 notebooklm.decomsoft.com 도메인이 있으시면, 배포 후 Render 설정 → Custom Domain에서 도메인 연결 가능
DB 만든 후 URL 복사하는 부분에서 막히면 알려주세요!