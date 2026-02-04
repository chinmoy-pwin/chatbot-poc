from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import aiofiles
from bs4 import BeautifulSoup
import requests
from PyPDF2 import PdfReader
from docx import Document
import json
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from emergentintegrations.llm.chat import LlmChat, UserMessage
from elevenlabs import ElevenLabs
from elevenlabs import VoiceSettings

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize ElevenLabs client
eleven_client = ElevenLabs(api_key=os.environ.get('ELEVENLABS_API_KEY', 'your_elevenlabs_api_key_here'))

# Initialize scheduler
scheduler = AsyncIOScheduler()

# Create the main app
app = FastAPI(title="KbaseAI Chatbot API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    webhook_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    webhook_url: Optional[str] = None

class KnowledgeFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    filename: str
    file_type: str
    content: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScrapedContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    url: str
    content: str
    scraped_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScrapeConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    urls: List[str]
    schedule: Optional[str] = "0 0 * * *"  # Daily at midnight
    auto_scrape: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ScrapeConfigCreate(BaseModel):
    customer_id: str
    urls: List[str]
    schedule: Optional[str] = "0 0 * * *"
    auto_scrape: bool = False

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    customer_id: str
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    sources: List[str] = []

class TTSRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Default voice
    stability: float = 0.5
    similarity_boost: float = 0.75
    style: float = 0.0
    use_speaker_boost: bool = True

class TTSResponse(BaseModel):
    audio_url: str
    text: str
    voice_id: str

class ManualScrapeRequest(BaseModel):
    customer_id: str
    urls: List[str]

class STTResponse(BaseModel):
    transcribed_text: str
    filename: str

class WebhookChatRequest(BaseModel):
    customer_id: str
    message: str
    user_id: Optional[str] = None

# ==================== UTILITY FUNCTIONS ====================

def prepare_for_mongo(data: dict) -> dict:
    """Convert datetime objects to ISO strings for MongoDB storage"""
    result = {}
    for key, value in data.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [prepare_for_mongo(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            result[key] = prepare_for_mongo(value)
        else:
            result[key] = value
    return result

async def extract_text_from_file(file: UploadFile) -> str:
    """Extract text from various file types"""
    content = await file.read()
    file_extension = file.filename.split('.')[-1].lower()
    
    try:
        if file_extension == 'pdf':
            pdf_reader = PdfReader(io.BytesIO(content))
            text = ''
            for page in pdf_reader.pages:
                text += page.extract_text() + '\n'
            return text
        
        elif file_extension == 'docx':
            doc = Document(io.BytesIO(content))
            text = '\n'.join([para.text for para in doc.paragraphs])
            return text
        
        elif file_extension == 'txt':
            return content.decode('utf-8')
        
        elif file_extension == 'json':
            data = json.loads(content.decode('utf-8'))
            return json.dumps(data, indent=2)
        
        elif file_extension == 'csv':
            return content.decode('utf-8')
        
        elif file_extension == 'md':
            return content.decode('utf-8')
        
        else:
            return content.decode('utf-8', errors='ignore')
    
    except Exception as e:
        logger.error(f"Error extracting text from {file.filename}: {str(e)}")
        return f"Error extracting text: {str(e)}"

async def scrape_website(url: str) -> str:
    """Scrape content from a website URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text
        text = soup.get_text()
        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text
    except Exception as e:
        logger.error(f"Error scraping {url}: {str(e)}")
        return f"Error scraping URL: {str(e)}"

async def get_knowledge_context(customer_id: str, query: str) -> tuple[str, List[str]]:
    """Retrieve relevant knowledge base content for a customer"""
    # Get all KB files for customer
    kb_files = await db.knowledge_files.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    
    # Get all scraped content for customer
    scraped = await db.scraped_content.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    
    # Combine all content
    all_content = []
    sources = []
    
    for kb in kb_files:
        all_content.append(f"From {kb['filename']}: {kb['content'][:1000]}")
        sources.append(kb['filename'])
    
    for sc in scraped:
        all_content.append(f"From {sc['url']}: {sc['content'][:1000]}")
        sources.append(sc['url'])
    
    # Simple context building (can be enhanced with vector search/embeddings)
    context = "\n\n".join(all_content[:5])  # Limit to top 5 sources
    
    return context, sources[:5]

# ==================== API ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "KbaseAI Chatbot API is running"}

# Customer Management
@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate):
    customer_obj = Customer(**customer.model_dump())
    doc = prepare_for_mongo(customer_obj.model_dump())
    await db.customers.insert_one(doc)
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers():
    customers = await db.customers.find({}, {"_id": 0}).to_list(100)
    for customer in customers:
        if isinstance(customer['created_at'], str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if isinstance(customer['created_at'], str):
        customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    return customer

# Knowledge Base Management
@api_router.post("/knowledge/upload")
async def upload_knowledge_file(
    customer_id: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        # Extract text from file
        content = await extract_text_from_file(file)
        
        # Create knowledge file record
        kb_file = KnowledgeFile(
            customer_id=customer_id,
            filename=file.filename,
            file_type=file.filename.split('.')[-1].lower(),
            content=content
        )
        
        # Save to database
        doc = prepare_for_mongo(kb_file.model_dump())
        await db.knowledge_files.insert_one(doc)
        
        return {"message": "File uploaded successfully", "file_id": kb_file.id, "filename": file.filename}
    
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@api_router.get("/knowledge/{customer_id}")
async def get_knowledge_files(customer_id: str):
    files = await db.knowledge_files.find({"customer_id": customer_id}, {"_id": 0, "content": 0}).to_list(100)
    for file in files:
        if isinstance(file['uploaded_at'], str):
            file['uploaded_at'] = datetime.fromisoformat(file['uploaded_at'])
    return files

@api_router.delete("/knowledge/{file_id}")
async def delete_knowledge_file(file_id: str):
    result = await db.knowledge_files.delete_one({"id": file_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted successfully"}

# Web Scraping
@api_router.post("/scrape/config", response_model=ScrapeConfig)
async def create_scrape_config(config: ScrapeConfigCreate):
    config_obj = ScrapeConfig(**config.model_dump())
    doc = prepare_for_mongo(config_obj.model_dump())
    await db.scrape_configs.insert_one(doc)
    
    # Schedule auto-scraping if enabled
    if config.auto_scrape:
        scheduler.add_job(
            scrape_urls_job,
            CronTrigger.from_crontab(config.schedule),
            args=[config.customer_id],
            id=f"scrape_{config_obj.id}",
            replace_existing=True
        )
    
    return config_obj

@api_router.get("/scrape/config/{customer_id}", response_model=List[ScrapeConfig])
async def get_scrape_configs(customer_id: str):
    configs = await db.scrape_configs.find({"customer_id": customer_id}, {"_id": 0}).to_list(100)
    for config in configs:
        if isinstance(config['created_at'], str):
            config['created_at'] = datetime.fromisoformat(config['created_at'])
    return configs

@api_router.post("/scrape/manual")
async def manual_scrape(customer_id: str, urls: List[str]):
    results = []
    for url in urls:
        content = await scrape_website(url)
        scraped = ScrapedContent(
            customer_id=customer_id,
            url=url,
            content=content
        )
        doc = prepare_for_mongo(scraped.model_dump())
        await db.scraped_content.insert_one(doc)
        results.append({"url": url, "status": "success", "content_length": len(content)})
    
    return {"message": "Scraping completed", "results": results}

@api_router.get("/scrape/content/{customer_id}")
async def get_scraped_content(customer_id: str):
    content = await db.scraped_content.find({"customer_id": customer_id}, {"_id": 0, "content": 0}).to_list(100)
    for item in content:
        if isinstance(item['scraped_at'], str):
            item['scraped_at'] = datetime.fromisoformat(item['scraped_at'])
    return content

async def scrape_urls_job(customer_id: str):
    """Background job to scrape URLs for a customer"""
    configs = await db.scrape_configs.find({"customer_id": customer_id, "auto_scrape": True}, {"_id": 0}).to_list(100)
    for config in configs:
        for url in config['urls']:
            content = await scrape_website(url)
            scraped = ScrapedContent(
                customer_id=customer_id,
                url=url,
                content=content
            )
            doc = prepare_for_mongo(scraped.model_dump())
            await db.scraped_content.insert_one(doc)
    logger.info(f"Auto-scraping completed for customer {customer_id}")

# Chat/RAG Endpoint
@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        
        # Get knowledge context
        context, sources = await get_knowledge_context(request.customer_id, request.message)
        
        # Build prompt with context
        system_message = f"""You are a helpful AI assistant. Answer questions based on the following knowledge base context.
        If the answer is not in the context, say so politely.
        
        Context:
        {context}
        """
        
        # Initialize LLM chat
        chat_client = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=session_id,
            system_message=system_message
        )
        chat_client.with_model("openai", "gpt-5.2")
        
        # Send message
        user_message = UserMessage(text=request.message)
        response = await chat_client.send_message(user_message)
        
        # Store conversation
        conversation = {
            "customer_id": request.customer_id,
            "session_id": session_id,
            "messages": [
                {"role": "user", "content": request.message, "timestamp": datetime.now(timezone.utc).isoformat()},
                {"role": "assistant", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()}
            ]
        }
        await db.conversations.insert_one(conversation)
        
        return ChatResponse(response=response, session_id=session_id, sources=sources)
    
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

# Webhook Endpoint (Public)
@api_router.post("/webhook/chat", response_model=ChatResponse)
async def webhook_chat(request: WebhookChatRequest):
    """Public webhook endpoint for external websites"""
    try:
        chat_request = ChatRequest(
            customer_id=request.customer_id,
            message=request.message,
            session_id=request.user_id
        )
        return await chat(chat_request)
    except Exception as e:
        logger.error(f"Error in webhook chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook chat: {str(e)}")

# Voice/TTS Endpoint
@api_router.post("/voice/tts", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    """Generate text-to-speech audio using ElevenLabs"""
    try:
        voice_settings = VoiceSettings(
            stability=request.stability,
            similarity_boost=request.similarity_boost,
            style=request.style,
            use_speaker_boost=request.use_speaker_boost
        )
        
        audio_generator = eleven_client.text_to_speech.convert(
            text=request.text,
            voice_id=request.voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=voice_settings
        )
        
        # Collect audio data
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        # Convert to base64 for transfer
        audio_b64 = base64.b64encode(audio_data).decode()
        
        tts_response = TTSResponse(
            audio_url=f"data:audio/mpeg;base64,{audio_b64}",
            text=request.text,
            voice_id=request.voice_id
        )
        
        return tts_response
    
    except Exception as e:
        logger.error(f"Error generating TTS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating TTS: {str(e)}")

# Voice/STT Endpoint
@api_router.post("/voice/stt", response_model=STTResponse)
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """Transcribe audio file to text using ElevenLabs Speech-to-Text"""
    try:
        audio_content = await audio_file.read()
        
        transcription_response = eleven_client.speech_to_text.convert(
            file=io.BytesIO(audio_content),
            model_id="scribe_v1"
        )
        
        transcribed_text = transcription_response.text if hasattr(transcription_response, 'text') else str(transcription_response)
        
        stt_response = STTResponse(
            transcribed_text=transcribed_text,
            filename=audio_file.filename or "unknown.audio"
        )
        
        return stt_response
    
    except Exception as e:
        logger.error(f"Error transcribing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")

# Get available voices
@api_router.get("/voice/voices")
async def get_voices():
    """Get available ElevenLabs voices"""
    try:
        voices_response = await eleven_client.voices.get_all()
        voices = [{"voice_id": v.voice_id, "name": v.name} for v in voices_response.voices] if hasattr(voices_response, 'voices') else []
        return {"voices": voices}
    except Exception as e:
        logger.error(f"Error fetching voices: {str(e)}")
        return {"voices": [{"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel (Default)"}]}

# Stats/Dashboard
@api_router.get("/stats/{customer_id}")
async def get_stats(customer_id: str):
    kb_count = await db.knowledge_files.count_documents({"customer_id": customer_id})
    scraped_count = await db.scraped_content.count_documents({"customer_id": customer_id})
    conversation_count = await db.conversations.count_documents({"customer_id": customer_id})
    
    return {
        "knowledge_files": kb_count,
        "scraped_pages": scraped_count,
        "conversations": conversation_count
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    scheduler.start()
    logger.info("Scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    client.close()
    logger.info("Scheduler and DB connection closed")