package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
)

// EncryptAESGCM 使用 AES-GCM 加密明文。
// keyStr 会经过 SHA-256 派生为 32 字节密钥；ivHex 为 12 字节 nonce 的十六进制表示。
// 返回 Base64 编码的密文。
func EncryptAESGCM(plainText, keyStr, ivHex string) (string, error) {
	key := sha256.Sum256([]byte(keyStr))
	iv, err := hex.DecodeString(ivHex)
	if err != nil {
		return "", fmt.Errorf("decode iv: %w", err)
	}

	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", fmt.Errorf("new cipher: %w", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("new gcm: %w", err)
	}
	if len(iv) != aesgcm.NonceSize() {
		return "", errors.New("IV 长度不符合 AES-GCM nonce 要求（需 12 字节）")
	}

	cipherBytes := aesgcm.Seal(nil, iv, []byte(plainText), nil)
	return base64.StdEncoding.EncodeToString(cipherBytes), nil
}

// DecryptAESGCM 使用 AES-GCM 解密密文。
// keyStr 会经过 SHA-256 派生为 32 字节密钥；ivHex 为 12 字节 nonce 的十六进制表示；
// cipherBase64 为 Base64 编码的密文（含 GCM 认证标签）。
func DecryptAESGCM(cipherBase64, keyStr, ivHex string) (string, error) {
	key := sha256.Sum256([]byte(keyStr))
	iv, err := hex.DecodeString(ivHex)
	if err != nil {
		return "", fmt.Errorf("decode iv: %w", err)
	}

	cipherBytes, err := base64.StdEncoding.DecodeString(cipherBase64)
	if err != nil {
		return "", fmt.Errorf("decode cipher base64: %w", err)
	}

	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", fmt.Errorf("new cipher: %w", err)
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("new gcm: %w", err)
	}
	if len(iv) != aesgcm.NonceSize() {
		return "", errors.New("IV 长度不符合 AES-GCM nonce 要求（需 12 字节）")
	}

	plainBytes, err := aesgcm.Open(nil, iv, cipherBytes, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt: %w", err)
	}

	return string(plainBytes), nil
}
