package crypto

import "testing"

func TestAESGCMRoundTrip(t *testing.T) {
	iv := "00112233445566778899aabb"
	key := "test-key"
	plain := "Aa123456"

	cipherText, err := EncryptAESGCM(plain, key, iv)
	if err != nil {
		t.Fatalf("EncryptAESGCM() error = %v", err)
	}

	got, err := DecryptAESGCM(cipherText, key, iv)
	if err != nil {
		t.Fatalf("DecryptAESGCM() error = %v", err)
	}

	if got != plain {
		t.Fatalf("DecryptAESGCM() = %q, want %q", got, plain)
	}
}

func TestAESGCMRejectsInvalidIV(t *testing.T) {
	if _, err := EncryptAESGCM("plain", "key", "0011"); err == nil {
		t.Fatal("EncryptAESGCM() error = nil, want invalid IV error")
	}
}
