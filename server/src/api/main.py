import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from starlette.status import HTTP_404_NOT_FOUND, HTTP_422_UNPROCESSABLE_ENTITY
from server.src.services.proof_service import ProofService, get_proof_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ProofLink API")


@app.get("/")
def read_root():
    return {"message": "Welcome to the ProofLink API"}


@app.post("/proof/{token}")
async def upload_proof_of_delivery(
    token: str,
    file: UploadFile = File(...),
    proof_service: ProofService = Depends(get_proof_service),
):
    """
    Uploads a proof of delivery image for the order associated with the token.
    """
    if not file.content_type.startswith("image/"):
        logger.warning(f"Invalid file type uploaded for token {token}: {file.content_type}")
        raise HTTPException(
            status_code=HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid file type. Only images are allowed.",
        )

    try:
        proof = await proof_service.create_proof(token=token, file=file)
        logger.info(f"Successfully created proof {proof.id} for order {proof.order_id}")
        return {
            "status": "success",
            "message": "Proof of delivery uploaded successfully.",
            "proof_id": proof.id,
        }
    except ValueError as e:
        logger.error(f"Invalid token used for upload: {token}")
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception(f"An unexpected error occurred during proof upload for token {token}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while processing the upload.",
        )
