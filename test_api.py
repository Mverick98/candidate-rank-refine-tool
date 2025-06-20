import subprocess
import time
import os
import sys
import json

# Attempt to import requests, install if not found
try:
    import requests
except ImportError:
    print("Requests library not found. Attempting to install...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

# Configuration
BASE_URL = "http://localhost:8001/api" # Added /api prefix
USER_HEADERS = {"X-User-ID": "user1"}
# Ensure the dummy parquet file path is correct relative to where this script will be run
# Assuming this script is run from the project root.
PARQUET_FILE_PATH = "data/dummy_rankings.parquet"
# Path to the main.py, assuming backend is a subdirectory of project root
MAIN_PY_PATH = os.path.join("backend", "main.py")


def print_test_result(test_name, response, expected_status=200):
    print(f"--- Test: {test_name} ---")
    if response is None:
        print("ERROR: No response received (request might have failed)")
        print(f"RESULT: {test_name} FAIL")
        return False

    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response JSON: {response.json()}")
    except requests.exceptions.JSONDecodeError:
        print(f"Response Text: {response.text}")

    if response.status_code == expected_status:
        print(f"RESULT: {test_name} PASS")
        return True
    else:
        print(f"RESULT: {test_name} FAIL (Expected {expected_status}, Got {response.status_code})")
        return False

def start_server():
    print(f"Starting server: python -m uvicorn {MAIN_PY_PATH.replace(os.sep, '.')[:-3]}:app --host 0.0.0.0 --port 8001")
    # Replace os.sep with . and remove .py for module path: backend/main.py -> backend.main
    module_path = MAIN_PY_PATH.replace(os.sep, ".")[:-3] if MAIN_PY_PATH.endswith(".py") else MAIN_PY_PATH.replace(os.sep, ".")

    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", f"{module_path}:app", "--host", "0.0.0.0", "--port", "8001"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    print("Waiting for server to start...")
    time.sleep(10) # Wait for server to initialize
    return process

def stop_server(process):
    print("Stopping server...")
    process.terminate()
    try:
        stdout, stderr = process.communicate(timeout=5)
        print("Server stdout:")
        print(stdout.decode() if stdout else "")
        print("Server stderr:")
        print(stderr.decode() if stderr else "")
    except subprocess.TimeoutExpired:
        process.kill()
        print("Server killed after timeout.")
    print("Server stopped.")

processed_demand_ids_global = []
first_demand_id_global = None
comparison_details_global = {} # Store comparison_id and presented candidate IDs

def test_upload_rankings():
    global processed_demand_ids_global, first_demand_id_global
    print_test_result("test_upload_rankings header", None) # Just a header for the section
    if not os.path.exists(PARQUET_FILE_PATH):
        print(f"ERROR: Parquet file {PARQUET_FILE_PATH} not found. Skipping upload test.")
        return False

    files = {'file': (os.path.basename(PARQUET_FILE_PATH), open(PARQUET_FILE_PATH, 'rb'), 'application/octet-stream')}
    try:
        response = requests.post(f"{BASE_URL}/upload_rankings/", files=files, headers=USER_HEADERS)
        passed = print_test_result("Upload Rankings", response)
        if passed and response.json().get("demand_ids_processed"):
            processed_demand_ids_global = response.json()["demand_ids_processed"]
            if processed_demand_ids_global:
                first_demand_id_global = processed_demand_ids_global[0]
                print(f"Stored first_demand_id_global: {first_demand_id_global}")
        return passed
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        print_test_result("Upload Rankings", None)
        return False
    finally:
        if 'file' in files: # Close the file
            files['file'][1].close()


def test_get_available_demands():
    print_test_result("test_get_available_demands header", None)
    try:
        response = requests.get(f"{BASE_URL}/get_available_demands/", headers=USER_HEADERS)
        passed = print_test_result("Get Available Demands", response)
        if passed and isinstance(response.json(), list):
            print(f"Number of available demands: {len(response.json())}")
        return passed
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        print_test_result("Get Available Demands", None)
        return False

def test_demand_lifecycle():
    global first_demand_id_global, comparison_details_global
    print_test_result("test_demand_lifecycle header", None)
    if not first_demand_id_global:
        print("No demand ID to test lifecycle. Skipping.")
        return False

    demand_id_to_test = first_demand_id_global
    all_passed = True

    try:
        # 1. Request demand for grading
        response_req = requests.post(f"{BASE_URL}/request_demand_for_grading/{demand_id_to_test}", headers=USER_HEADERS)
        if not print_test_result(f"Request Demand {demand_id_to_test}", response_req): all_passed = False

        # 2. Get comparison pair (a few times)
        for i in range(2): # Try to get and submit a pair twice
            print(f"Lifecycle attempt {i+1}")
            response_get_pair = requests.get(f"{BASE_URL}/get_comparison_pair/{demand_id_to_test}", headers=USER_HEADERS)
            if not print_test_result(f"Get Comparison Pair {i+1}", response_get_pair):
                all_passed = False
                if response_get_pair and response_get_pair.status_code == 404: # No more pairs or completed
                    print("No more pairs or demand completed, exiting lifecycle loop.")
                    break
                continue # Try next step even if this failed, or skip to release

            if response_get_pair.status_code == 200:
                pair_data = response_get_pair.json()
                comparison_id = pair_data.get("comparison_id")
                cand1_id = pair_data.get("candidate1_id")
                cand2_id = pair_data.get("candidate2_id")

                if not comparison_id or not cand1_id or not cand2_id:
                    print("ERROR: Get pair response missing crucial data.")
                    all_passed = False
                    continue

                comparison_details_global = {
                    "comparison_id": comparison_id,
                    "candidate1_id_presented": cand1_id, # These are the presented IDs
                    "candidate2_id_presented": cand2_id
                }

                # 3. Submit comparison result
                # CRITICAL ASSUMPTION: SubmitComparisonRequest model in main.py needs to be updated
                # to accept candidate1_id_presented and candidate2_id_presented.
                # The current model only has comparison_id, decision, user_id.
                # The ranking_logic.py's submit_comparison *needs* presented IDs.
                # The main.py workaround (using original IDs from merge_op) will be hit here.
                submit_payload = {
                    "comparison_id": comparison_id,
                    "decision": "1", # CANDIDATE1_BETTER
                    "user_id": "user1" # User making the decision (audit)
                    # "candidate1_id_presented": cand1_id, # Ideally sent if model supported
                    # "candidate2_id_presented": cand2_id  # Ideally sent if model supported
                }
                response_submit = requests.post(f"{BASE_URL}/submit_comparison_result/", json=submit_payload, headers=USER_HEADERS)
                if not print_test_result(f"Submit Comparison Result {i+1}", response_submit): all_passed = False
                if response_submit.status_code == 200 and response_submit.json().get("is_completed"):
                    print("Demand completed after submission.")
                    break # Exit loop if completed

        # 4. Release demand
        response_release = requests.post(f"{BASE_URL}/release_demand/{demand_id_to_test}", headers=USER_HEADERS)
        if not print_test_result(f"Release Demand {demand_id_to_test}", response_release): all_passed = False

        return all_passed

    except requests.exceptions.RequestException as e:
        print(f"Request failed during lifecycle: {e}")
        return False


def test_get_ranking_status():
    print_test_result("test_get_ranking_status header", None)
    if not first_demand_id_global:
        print("No demand ID to test status. Skipping.")
        return False
    try:
        response = requests.get(f"{BASE_URL}/get_ranking_status/{first_demand_id_global}", headers=USER_HEADERS)
        return print_test_result(f"Get Ranking Status for {first_demand_id_global}", response)
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        print_test_result(f"Get Ranking Status for {first_demand_id_global}", None)
        return False

def test_get_results_after_completion():
    # This test is tricky because the lifecycle test might not fully complete a demand.
    # It will try to get results for the first demand ID, expecting it might be completed.
    # A more robust test would ensure completion first.
    print_test_result("test_get_results_after_completion header", None)
    if not first_demand_id_global:
        print("No demand ID to test results. Skipping.")
        return True # Pass benignly

    demand_id_to_test = first_demand_id_global
    all_passed = True
    try:
        # First, ensure it's completed by trying to get pairs until it says so.
        # This is a simplified completion loop.
        print(f"Ensuring demand {demand_id_to_test} is completed for results testing...")
        # Request it first if not already done by lifecycle
        requests.post(f"{BASE_URL}/request_demand_for_grading/{demand_id_to_test}", headers=USER_HEADERS)

        for _ in range(20): # Max attempts to complete
            pair_resp = requests.get(f"{BASE_URL}/get_comparison_pair/{demand_id_to_test}", headers=USER_HEADERS)
            if pair_resp.status_code == 200:
                if "Ranking for this demand ID is now completed" in pair_resp.json().get("detail",""): # Check detail for completion message
                     print("Demand reported as completed by get_comparison_pair.")
                     break
                if pair_resp.json().get("comparison_id"):
                    pair_data = pair_resp.json()
                    submit_payload = {
                        "comparison_id": pair_data["comparison_id"], "decision": "1", "user_id": "user1"
                    }
                    submit_resp = requests.post(f"{BASE_URL}/submit_comparison_result/", json=submit_payload, headers=USER_HEADERS)
                    if submit_resp.status_code == 200 and submit_resp.json().get("is_completed"):
                        print("Demand completed via submission.")
                        break
                else: # No comparison_id means no more pairs or other issue
                    print("No comparison_id in get_pair response during completion loop.")
                    break
            elif pair_resp.status_code == 404 or (pair_resp.status_code == 200 and "completed" in pair_resp.text.lower()): # No more pairs or already completed
                print("Demand likely completed or no more pairs from get_comparison_pair.")
                break
            else: # Other error
                print(f"Error trying to get pair for completion: {pair_resp.status_code} {pair_resp.text}")
                break
            time.sleep(0.2) # Small delay

        # Now test results endpoints
        response_results = requests.get(f"{BASE_URL}/get_ranking_results/{demand_id_to_test}", headers=USER_HEADERS)
        if not print_test_result(f"Get Ranking Results for {demand_id_to_test}", response_results): all_passed = False

        response_prod = requests.get(f"{BASE_URL}/get_production_results/{demand_id_to_test}", headers=USER_HEADERS)
        if not print_test_result(f"Get Production Results for {demand_id_to_test}", response_prod): all_passed = False

        return all_passed
    except requests.exceptions.RequestException as e:
        print(f"Request failed during results testing: {e}")
        return False


def main():
    server_process = start_server()

    # Check if server is accessible
    try:
        # The /docs endpoint is usually at the root of the FastAPI app, not under /api
        requests.get(f"http://localhost:8001/docs", timeout=5)
        print("Server seems to be running.")
    except requests.exceptions.ConnectionError:
        print("ERROR: Server did not start or is not accessible. Aborting tests.")
        stop_server(server_process)
        sys.exit(1)

    overall_success = True
    if not test_upload_rankings(): overall_success = False
    if not test_get_available_demands(): overall_success = False
    # Only run lifecycle if upload created demands
    if first_demand_id_global:
        if not test_demand_lifecycle(): overall_success = False
        if not test_get_ranking_status(): overall_success = False # Check status after lifecycle attempts
        if not test_get_results_after_completion(): overall_success = False # Attempt to complete and get results
    else:
        print("Skipping lifecycle and results tests as no demand ID was processed from upload.")

    stop_server(server_process)

    if overall_success:
        print("\nOverall Test Result: ALL PASS (based on status codes and basic checks)")
        # Note: "ALL PASS" here means the script ran and endpoints returned expected status codes.
        # It doesn't deeply validate the internal logic of ranking or metrics beyond what's printed.
    else:
        print("\nOverall Test Result: SOME FAILURES")
        sys.exit(1) # Indicate failure

if __name__ == "__main__":
    main()
