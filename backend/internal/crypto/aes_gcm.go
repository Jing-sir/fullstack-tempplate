package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
)

// EncryptAESGCM 加密
func EncryptAESGCM(plainText, keyStr, ivHex string) (string, error) {
	key := sha256.Sum256([]byte(keyStr))
	iv, err := hex.DecodeString(ivHex)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(iv) != aesgcm.NonceSize() {
		return "", errors.New("invalid iv size")
	}

	cipherBytes := aesgcm.Seal(nil, iv, []byte(plainText), nil)

	return base64.StdEncoding.EncodeToString(cipherBytes), nil
}

// DecryptAESGCM 解密
func DecryptAESGCM(cipherBase64, keyStr, ivHex string) (string, error) {
	key := sha256.Sum256([]byte(keyStr))
	iv, err := hex.DecodeString(ivHex)
	if err != nil {
		return "", err
	}

	cipherBytes, err := base64.StdEncoding.DecodeString(cipherBase64)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(iv) != aesgcm.NonceSize() {
		return "", errors.New("invalid iv size")
	}

	plainBytes, err := aesgcm.Open(nil, iv, cipherBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plainBytes), nil
}
