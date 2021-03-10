GOOGLE_CLOUD_PROJECT=$(gcloud config get-value project)
echo " "
echo "Google Cloud Project: $GOOGLE_CLOUD_PROJECT"
echo " "
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/file2pdf-converter
gcloud beta run deploy file2pdf-converter --image gcr.io/$GOOGLE_CLOUD_PROJECT/file2pdf-converter --platform managed --region us-central1 --no-allow-unauthenticated
SERVICE_URL=$(gcloud beta run services describe file2pdf-converter --platform managed --region us-central1 --format="value(status.url)")
echo " "
echo "Service URL:   $SERVICE_URL"
echo " "
curl -X POST $SERVICE_URL
curl -X POST -H "Authorization: Bearer $(gcloud auth print-identity-token)" $SERVICE_URL
gsutil mb gs://$GOOGLE_CLOUD_PROJECT-file2pdf
gsutil mb gs://$GOOGLE_CLOUD_PROJECT-pdf-done 
echo " "
echo "Buckets Has Been Created $GOOGLE_CLOUD_PROJECT-file2pdf", "$GOOGLE_CLOUD_PROJECT-pdf-done"
echo " "
gsutil notification create -t new-file2pdf -f json -e OBJECT_FINALIZE gs://$GOOGLE_CLOUD_PROJECT-file2pdf
echo " "
echo "Notification new-file2pdf for bucket file2pdf created"
echo " "
gcloud iam service-accounts create pubsub-cloud-run-invoker --display-name "PubSub Cloud Run Invoker" 
echo " "
echo "Service Account: PubSub Cloud Run Invoker Created"
echo " "
gcloud beta run services add-iam-policy-binding file2pdf-converter --member=serviceAccount:pubsub-cloud-run-invoker@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com --role=roles/run.invoker --platform managed --region us-central1
echo " "
echo "Cloud Run Invoker Role Added"
echo " "
PROJECT_NUMBER=$(gcloud projects list --filter=$GOOGLE_CLOUD_PROJECT --format="value(PROJECT_NUMBER)")
echo " "
echo "Project Number:   " $PROJECT_NUMBER
echo " "
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT --member=serviceAccount:service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
echo " "
echo "Cloud Token Creator Role Added"
echo " "
gcloud beta pubsub subscriptions create file2pdf-conv-sub --topic new-file2pdf --push-endpoint=$SERVICE_URL --push-auth-service-account=pubsub-cloud-run-invoker@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com
echo " "
echo "Subscription file2pdf-conv-sub on topic new-file2pdf Created"
echo " "
echo "Building Again"
echo " "
gcloud builds submit --tag gcr.io/$GOOGLE_CLOUD_PROJECT/file2pdf-converter
gcloud beta run deploy file2pdf-converter --image gcr.io/$GOOGLE_CLOUD_PROJECT/file2pdf-converter --platform managed --region us-central1 --memory=2Gi --no-allow-unauthenticated --set-env-vars PDF_BUCKET=$GOOGLE_CLOUD_PROJECT-pdf-done
