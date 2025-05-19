import discord
import os

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True

client = discord.Client(intents=intents)

TOKEN = os.getenv("TOKEN")  # Token lấy từ biến môi trường

@client.event
async def on_ready():
    print(f"Bot {client.user} đã sẵn sàng!")

# Người cuối cùng nhắn tin với bot
last_user = None

@client.event
async def on_message(message):
    global last_user
    if message.author == client.user:
        return

    # Chỉ phản hồi nếu tag bot hoặc là người dùng trước đó
    if message.content.startswith(f"<@{client.user.id}>") or message.author == last_user:
        prompt = message.content.replace(f"<@{client.user.id}>", "").strip()
        if not prompt:
            return
        last_user = message.author

        await message.channel.typing()
        response = f"**Claude GPT:**\n> {fake_gpt_response(prompt)}"
        await message.channel.send(response)

def fake_gpt_response(prompt):
    # Trả lời giả lập Claude
    return f"Tôi là Claude giả lập. Bạn vừa nói: “{prompt}”."

client.run(TOKEN)
