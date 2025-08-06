from pydantic import BaseModel, Field
from typing import List, Optional

class AgentRole(BaseModel):
    """
    Represents an AI Agent Role within the system.
    """
    id: str = Field(..., description="The unique identifier for the agent role (e.g., 'code', 'review').")
    name: str = Field(..., description="A human-readable name for the role (e.g., 'Code Agent', 'Review Agent').")
    description: Optional[str] = Field(None, description="A brief description of the agent role's purpose.")
    capabilities: List[str] = Field(default_factory=list, description="List of capabilities this role possesses.")
    # Add other relevant fields as needed for Graphiti integration

    class Config:
        # Example Graphiti configuration if needed
        # collection_name = "agent_roles"
        pass

# Example usage (optional, for testing/illustration)
if __name__ == "__main__":
    code_agent = AgentRole(id="code", name="Code Agent", description="Handles code implementation and modification.", capabilities=["python", "typescript", "file_io"])
    print(code_agent.model_dump_json(indent=2))