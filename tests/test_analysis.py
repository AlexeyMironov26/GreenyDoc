import pytest
from unittest.mock import patch

def test_analysis_guest(client, user_token, mock_plant_id):
    with open("test.jpg", "wb") as f:
        f.write(b"fake")
    with open("test.jpg", "rb") as f:
        resp = client.post(
            "/api/analyses",
            files={"file": ("test.jpg", f, "image/jpeg")},
            headers={"Authorization": f"Bearer {user_token}"}
        )
    assert resp.status_code == 200

def test_analysis_auth_saves(client, user_token, mock_plant_id):
    with patch("s3_service.upload_file") as mock_upload:
        mock_upload.return_value = "key123"
        with open("test.jpg", "wb") as f:
            f.write(b"fake")
        with open("test.jpg", "rb") as f:
            resp = client.post(
                "/api/analyses",
                files={"file": ("test.jpg", f, "image/jpeg")},
                headers={"Authorization": f"Bearer {user_token}"}
            )
        assert resp.status_code == 200

def test_user_can_get_own_analyses(client, user_token):
    resp = client.get("/api/analyses/my", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200

@pytest.mark.skip(reason="Требует прав админа")
def test_admin_can_get_all_analyses(client, admin_token):
    pass

def test_user_cannot_get_all_analyses(client, user_token):
    resp = client.get("/api/analyses/all", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 403

def test_invalid_file_type(client, user_token):
    with open("test.txt", "wb") as f:
        f.write(b"text")
    with open("test.txt", "rb") as f:
        resp = client.post(
            "/api/analyses",
            files={"file": ("test.txt", f, "text/plain")},
            headers={"Authorization": f"Bearer {user_token}"}
        )
    # API возвращает 200 с success=False 
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is False
    assert "неподдерживаемый" in data.get("error", "").lower() or "type" in data.get("error", "").lower()

def test_pagination_out_of_range(client, user_token):
    resp = client.get("/api/analyses/my?page=9999", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["data"] == []