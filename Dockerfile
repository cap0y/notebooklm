FROM node:20-alpine

WORKDIR /app

# package.json과 lock 파일만 먼저 복사 (캐시 활용)
COPY package.json package-lock.json ./

# 모든 의존성 설치 (devDependencies 포함 - 빌드에 필요)
RUN npm install --include=dev

# 소스 코드 복사
COPY . .

# 프론트엔드 빌드
RUN npm run build

# 불필요한 devDependencies 제거 (선택적 - 이미지 크기 감소)
# RUN npm prune --production

# 포트 노출
EXPOSE 5000

# 서버 시작
CMD ["npm", "start"]

