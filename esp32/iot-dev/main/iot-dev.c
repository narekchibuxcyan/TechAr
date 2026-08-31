#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_http_client.h"
#include "esp_https_ota.h"
#include "cJSON.h"

#include "lwip/err.h"
#include "lwip/sys.h"

#define WIFI_SSID      "TEAM_COMSO_BB8F"
#define WIFI_PASS      "94769297"
#define SERVER_URL     "http://localhost:5173/api/devices"
#define DEVICE_ID      "2c89fb7a-1f0d-416b-8908-e7122f957080"
#define DEVICE_TOKEN   "f45094857b4da811a241954a1b19d2fbdaf040600294668f"

static const char *TAG = "IoT_Device";
static EventGroupHandle_t s_wifi_event_group;
#define WIFI_CONNECTED_BIT BIT0

// WiFi Իրադարձությունների կառավարում
static void wifi_event_handler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        esp_wifi_connect();
        xEventGroupClearBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
        ESP_LOGI(TAG, "Retrying connection to AP");
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        ESP_LOGI(TAG, "Got IP:" IPSTR, IP2STR(&event->ip_info.ip));
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

// WiFi Սկզբնավորում
void wifi_init_sta(void) {
    s_wifi_event_group = xEventGroupCreate();
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, &instance_any_id));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, &instance_got_ip));

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
        },
    };
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());
    ESP_LOGI(TAG, "wifi_init_sta finished.");
}

// Տելեմետրիայի ուղարկում (POST Request)
void send_telemetry_task(void *pvParameters) {
    char url[256];
    snprintf(url, sizeof(url), "%s/%s/telemetry", SERVER_URL, DEVICE_ID);
    
    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", DEVICE_TOKEN);

    while (1) {
        xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
        
        esp_http_client_config_t config = {
            .url = url,
            .method = HTTP_METHOD_POST,
        };
        esp_http_client_handle_t client = esp_http_client_init(&config);
        
        // Անվտանգության հեդերների ավելացում
        esp_http_client_set_header(client, "Content-Type", "application/json");
        esp_http_client_set_header(client, "Authorization", auth_header);

        // Կեղծ տվյալների ստեղծում JSON ֆորմատով (cJSON գրադարանով)
        cJSON *root = cJSON_CreateObject();
        cJSON_AddNumberToObject(root, "temperature", 24.5 + (rand() % 10) / 2.0);
        cJSON_AddNumberToObject(root, "humidity", 50.0 + (rand() % 15));
        cJSON_AddNumberToObject(root, "batteryLevel", 95 - (rand() % 5));
        char *post_data = cJSON_PrintUnformatted(root);
        
        esp_http_client_set_post_field(client, post_data, strlen(post_data));
        
        esp_err_t err = esp_http_client_perform(client);
        if (err == ESP_OK) {
            ESP_LOGI(TAG, "Telemetry sent successfully. HTTP Status = %d", esp_http_client_get_status_code(client));
        } else {
            ESP_LOGE(TAG, "HTTP POST request failed: %s", esp_err_to_name(err));
        }
        
        cJSON_Delete(root);
        free(post_data);
        esp_http_client_cleanup(client);
        
        vTaskDelay(pdMS_TO_TICKS(5000)); // 5 վայրկյան դադար
    }
}

// OTA Թարմացման ստուգում և ներբեռնում (GET Request & Flash)
void check_ota_task(void *pvParameters) {
    char url[256];
    snprintf(url, sizeof(url), "%s/%s/ota-check", SERVER_URL, DEVICE_ID);
    
    char auth_header[128];
    snprintf(auth_header, sizeof(auth_header), "Bearer %s", DEVICE_TOKEN);

    while (1) {
        vTaskDelay(pdMS_TO_TICKS(15000)); // Ստուգել յուրաքանչյուր 15 վայրկյանը մեկ
        xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT, pdFALSE, pdTRUE, portMAX_DELAY);

        ESP_LOGI(TAG, "Checking for remote firmware updates...");
        
        esp_http_client_config_t config = {
            .url = url,
            .method = HTTP_METHOD_GET,
        };
        esp_http_client_handle_t client = esp_http_client_init(&config);
        esp_http_client_set_header(client, "Authorization", auth_header);
        
        esp_err_t err = esp_http_client_perform(client);
        if (err == ESP_OK && esp_http_client_get_status_code(client) == 200) {
            // Նոր ծրագիր կա, ստանալ downloadUrl-ը
            char response_buffer[512];
            int read_len = esp_http_client_read_response(client, response_buffer, sizeof(response_buffer) - 1);
            response_buffer[read_len] = '\0';
            
            cJSON *json = cJSON_Parse(response_buffer);
            cJSON *downloadUrl = cJSON_GetObjectItem(json, "downloadUrl");
            
            if (downloadUrl && downloadUrl->valuestring) {
                ESP_LOGI(TAG, "New firmware URL: %s. Starting HTTPS OTA...", downloadUrl->valuestring);
                
                esp_http_client_config_t ota_client_config = {
                    .url = downloadUrl->valuestring,
                    // Եթե ունեք SSL սերտիֆիկատ, ավելացրեք .cert_pem դաշտը անվտանգության համար
                };
                
                // Ներկառուցված անվտանգ OTA գործընթացի սկիզբ
                esp_err_t ota_ret = esp_https_ota(&ota_client_config);
                if (ota_ret == ESP_OK) {
                    ESP_LOGI(TAG, "Firmware upgraded successfully! Rebooting...");
                    esp_restart(); // Սարքի վերագործարկում նոր ծրագրով
                } else {
                    ESP_LOGE(TAG, "Firmware upgrade failed!");
                }
            }
            cJSON_Delete(json);
        }
        esp_http_client_cleanup(client);
    }
}

void app_main(void) {
    // Սկզբնավորել NVS (անհրաժեշտ է WiFi-ի համար)
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    // Միանալ WiFi-ին
    wifi_init_sta();

    // Ստեղծել FreeRTOS անկախ առաջադրանքներ տվյալների և OTA-ի համար
    xTaskCreate(&send_telemetry_task, "send_telemetry_task", 4096, NULL, 5, NULL);
    xTaskCreate(&check_ota_task, "check_ota_task", 8192, NULL, 5, NULL);
}

