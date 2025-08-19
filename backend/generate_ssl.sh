#!/bin/bash

# Скрипт для генерации самоподписанного SSL сертификата

echo "🔐 Generating self-signed SSL certificate..."

# Создаем директорию для SSL
mkdir -p ssl

# Генерируем приватный ключ и сертификат
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/key.pem \
    -out ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=104.165.244.190" \
    -addext "subjectAltName=IP:104.165.244.190"

# Устанавливаем правильные права
chmod 644 ssl/cert.pem
chmod 600 ssl/key.pem

echo "✅ SSL certificate generated successfully!"
echo "📁 Files created:"
echo "   - ssl/cert.pem (certificate)"
echo "   - ssl/key.pem (private key)"
echo ""
echo "⚠️  This is a self-signed certificate."
echo "   Browsers will show a security warning."
echo "   Users need to accept the certificate to proceed."