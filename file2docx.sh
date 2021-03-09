GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)
echo `Google Cloud Project ${GOOGLE_CLOUD_PROJECT}`
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/file2docx-converter
gcloud beta run deploy file --image gcr.io/$GOOGLE_CLOUD_PROJECT/pdf2docx-converter --platform managed --region us-central1 --no-allow-unauthenticated
SERVICE_URL=$(gcloud beta run services describe pdf2docx --platform managed --region us-central1 --format="value(status.url)")
echo $SERVICE_URL
curl -X POST $SERVICE_URL
curl -X POST -H "Authorization: Bearer $(gcloud auth print-identity-token)" $SERVICE_URL
gsutil mb gs://$GOOGLE_CLOUD_PROJECT-pdf2docx
gsutil mb gs://$GOOGLE_CLOUD_PROJECT-docx-done 
gsutil notification create -t new-pdf -f json -e OBJECT_FINALIZE gs://$GOOGLE_CLOUD_PROJECT-pdf2docx
gcloud iam service-accounts create pubsub-cloud-run-invoker --display-name "PubSub Cloud Run Invoker" 
gcloud beta run services add-iam-policy-binding pdf2docx-converter --member=serviceAccount:pubsub-cloud-run-invoker@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com --role=roles/run.invoker --platform managed --region us-central1
PROJECT_NUMBER=$(gcloud projects list --filter=$GOOGLE_CLOUD_PROJECT --format="value(PROJECT_NUMBER)")
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT --member=serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
gcloud beta pubsub subscriptions create pdf2docx-conv-sub --topic new-pdf --push-endpoint=$SERVICE_URL --push-auth-service-account=pubsub-cloud-run-invoker@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/pdf2docx-converter
gcloud beta run deploy pdf2docx-converter --image gcr.io/$GOOGLE_CLOUD_PROJECT/pdf2docx-converter --platform managed --region us-central1 --memory=2Gi --no-allow-unauthenticated --set-env-vars PDF_BUCKET=$GOOGLE_CLOUD_PROJECT-docx-done
