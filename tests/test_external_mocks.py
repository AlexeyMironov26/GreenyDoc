import pytest
from unittest.mock import patch

def test_plant_id_api_failure_graceful_degradation(client, user_token):
    with patch("common.analyze_plant_disease") as mock:
        mock.return_value = {"error": "API временно недоступен"}
        
        with open("test.jpg", "wb") as f:
            f.write(b"fake")
        
        with open("test.jpg", "rb") as f:
            resp = client.post(
                "/api/analyses",
                files={"file": ("test.jpg", f, "image/jpeg")},
                headers={"Authorization": f"Bearer {user_token}"}
            )
        assert resp.status_code == 200
        # Проверяем, что вернулся тестовый анализ
        assert "Тестовый анализ" in resp.json()["analysis_result"]["disease_name"]