/* Adições resumidas do suplemento de Julho/2026. Sem reprodução de textos longos. */
window.NEX_JULY_THREATS=[
  {
    "name": "Raziel",
    "element": "Sangue",
    "source": "Arquivos Secretos — Julho",
    "category": "Pessoa",
    "page": 40
  },
  {
    "name": "Alvira",
    "element": "Sangue",
    "source": "Arquivos Secretos — Julho",
    "category": "Pessoa",
    "page": 42
  },
  {
    "name": "Sabara",
    "element": "Sangue",
    "source": "Arquivos Secretos — Julho",
    "category": "Pessoa",
    "page": 43
  },
  {
    "name": "Velisar",
    "element": "Sangue",
    "source": "Arquivos Secretos — Julho",
    "category": "Pessoa",
    "page": 44
  },
  {
    "name": "Zéfero",
    "element": "Sangue",
    "source": "Arquivos Secretos — Julho",
    "category": "Pessoa",
    "page": 45
  },
  {
    "name": "Incinerado",
    "element": "Energia",
    "source": "Arquivos Secretos — Julho",
    "category": "Criatura",
    "page": 65
  },
  {
    "name": "Strzyga",
    "element": "Sangue",
    "source": "Arquivos Secretos — Julho",
    "category": "Criatura",
    "page": 67
  },
  {
    "name": "Apóstata",
    "element": "Conhecimento",
    "source": "Arquivos Secretos — Julho",
    "category": "Criatura",
    "page": 70
  }
];
window.NEX_JULY_THREAT_DETAILS={
  "Arquivos Secretos — Julho::Raziel": {
    "vd": 120,
    "pv": 240,
    "defense": 28,
    "movement": "9m",
    "attributes": {
      "AGI": 4,
      "INT": 3,
      "VIG": 3,
      "FOR": 3,
      "PRE": 2
    },
    "abilities": [
      {
        "name": "Fúria Sanguinária",
        "effect": "Quando estiver ferido ou enfurecido, pode assumir a forma O Verdadeiro Raziel, a critério do mestre."
      },
      {
        "name": "Ignorar Dor",
        "effect": "A aparência de invulnerabilidade é encenação; Intuição ou Percepção DT 30 permite perceber o engano."
      },
      {
        "name": "Monstruosidade",
        "effect": "Possui faro, percepção às cegas, resistência física 10 e Sangue 20; vulnerável à Morte."
      },
      {
        "name": "Vingança",
        "effect": "Se um aliado morrer diante dele, passa a perseguir os responsáveis e pode desencadear sua transformação."
      }
    ],
    "pdfPage": 40,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral.",
    "resistances": [
      "Balístico, impacto e perfuração 10",
      "Sangue 20"
    ],
    "weaknesses": [
      "Morte"
    ],
    "size": "Médio",
    "senses": [
      "Percepção 2d20+5",
      "Iniciativa 4d20+10",
      "Faro e percepção às cegas"
    ],
    "saves": [
      [
        "Fortitude",
        "3d20+10"
      ],
      [
        "Reflexos",
        "4d20+10"
      ],
      [
        "Vontade",
        "2d20+5"
      ]
    ],
    "skills": [
      [
        "Atletismo",
        "3d20+10"
      ],
      [
        "Intimidação",
        "2d20+10"
      ],
      [
        "Ocultismo",
        "3d20+10"
      ]
    ],
    "actions": [
      {
        "name": "Agredir — Garras",
        "type": "Padrão",
        "test": "4d20+15",
        "damage": "2d10+10 corte",
        "effect": "Dois ataques corpo a corpo; crítico 19.",
        "critical": "19"
      },
      {
        "name": "Revidar e Estripar",
        "type": "Reação",
        "test": "4d20+15",
        "damage": "2d10+10 corte",
        "effect": "Uma vez por rodada, contra-ataca quem o agride corpo a corpo; perde suas resistências a dano por uma rodada."
      },
      {
        "name": "Abraço Sanguinolento",
        "type": "Livre",
        "test": "4d20+15",
        "damage": "6d6 Sangue",
        "effect": "Ao acertar as garras, pode agarrar. Uma vez por rodada morde vítima agarrada; Fortitude DT 23 reduz dano à metade e cura metade do dano causado."
      },
      {
        "name": "Maldição Sanguínea",
        "type": "Movimento",
        "effect": "Alvo em alcance curto recebe penalidade de um dado nos testes até o fim da cena; Fortitude DT 23 reduz duração a uma rodada."
      },
      {
        "name": "Perseguir",
        "type": "Movimento",
        "effect": "Uma vez por rodada desloca-se até o dobro de sua velocidade na direção de alvo que pretende eliminar."
      },
      {
        "name": "Endurecer Sangue",
        "type": "Padrão",
        "effect": "Ganha resistência a dano 10 até o final da cena."
      },
      {
        "name": "Fazer Sangrar",
        "type": "Padrão",
        "damage": "6d6 Sangue",
        "effect": "Afeta um alvo em alcance longo; sangramento de 2d6 PV. Fortitude DT 23 reduz dano à metade e evita sangramento."
      }
    ]
  },
  "Arquivos Secretos — Julho::O Verdadeiro Raziel": {
    "vd": 200,
    "pv": 400,
    "defense": 38,
    "movement": "12m",
    "attributes": {
      "AGI": 4,
      "INT": 3,
      "VIG": 3,
      "FOR": 3,
      "PRE": 2
    },
    "abilities": [
      {
        "name": "Fúria Sanguinária",
        "effect": "Forma que Raziel assume quando ferido ou enfurecido. Se entrar na transformação com menos de 200 PV, fica com 200 PV."
      },
      {
        "name": "Monstruosidade",
        "effect": "Faro e percepção às cegas; resistências físicas 10 e a Sangue 20; vulnerabilidade à Morte."
      },
      {
        "name": "Sede Incontrolável",
        "effect": "Prioriza inimigos que ameacem Alvira; caso contrário, persegue o alvo com menos PV."
      }
    ],
    "pdfPage": 41,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral.",
    "resistances": [
      "Balístico, impacto e perfuração 10",
      "Sangue 20"
    ],
    "weaknesses": [
      "Morte"
    ],
    "size": "Médio",
    "senses": [
      "Percepção 2d20+10",
      "Iniciativa 4d20+15",
      "Faro e percepção às cegas"
    ],
    "saves": [
      [
        "Fortitude",
        "3d20+15"
      ],
      [
        "Reflexos",
        "4d20+15"
      ],
      [
        "Vontade",
        "2d20+10"
      ]
    ],
    "skills": [
      [
        "Atletismo",
        "3d20+15"
      ],
      [
        "Intimidação",
        "2d20+15"
      ],
      [
        "Ocultismo",
        "3d20+15"
      ]
    ],
    "actions": [
      {
        "name": "Agredir — Garras",
        "type": "Padrão",
        "test": "4d20+25",
        "damage": "4d10+20 corte",
        "effect": "Dois ataques corpo a corpo; crítico 19.",
        "critical": "19"
      },
      {
        "name": "Revidar e Estripar",
        "type": "Reação",
        "test": "4d20+25",
        "damage": "4d10+20 corte",
        "effect": "Uma vez por rodada, reage a ataque corpo a corpo; ao fazê-lo, perde suas resistências a dano por uma rodada."
      },
      {
        "name": "Abraço Sanguinolento",
        "type": "Livre",
        "test": "4d20+15",
        "damage": "10d6 Sangue",
        "effect": "Após atingir com garras, pode agarrar; uma mordida por rodada em ser agarrado causa dano (Fortitude DT 29 metade) e recupera metade do dano causado."
      },
      {
        "name": "Perseguir",
        "type": "Movimento",
        "effect": "Uma vez por rodada desloca-se até duas vezes sua velocidade na direção de alvo hostil prioritário."
      },
      {
        "name": "Bote Retalhador",
        "type": "Padrão",
        "damage": "8d10+20 corte",
        "effect": "Salta sobre alvo até 3m. Alvo pode reagir com um ataque único ou tentar Reflexos DT 29; sucesso reduz dano à metade e evita queda e sangramento."
      }
    ]
  },
  "Arquivos Secretos — Julho::Alvira": {
    "vd": 120,
    "pv": 210,
    "defense": 26,
    "movement": "9m",
    "attributes": {
      "AGI": 3,
      "INT": 2,
      "VIG": 2,
      "FOR": 1,
      "PRE": 4
    },
    "abilities": [
      {
        "name": "Madre Superior",
        "effect": "Aliado adjacente pode gastar movimento e consumir 3d8+3 PV dela para recuperar a mesma quantidade, ou metade quando ela está ferida; indisponível se estiver morrendo."
      },
      {
        "name": "Monstruosidade",
        "effect": "Possui faro, percepção às cegas, resistências físicas 10 e Sangue 20; vulnerável à Morte."
      },
      {
        "name": "Rituais",
        "effect": "Conjura Vampirismo com DT 23, sem gastar PE até 10 PE por conjuração."
      }
    ],
    "pdfPage": 42,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral.",
    "resistances": [
      "Balístico, impacto e perfuração 10",
      "Sangue 20"
    ],
    "weaknesses": [
      "Morte"
    ],
    "size": "Médio",
    "senses": [
      "Percepção 4d20+10",
      "Iniciativa 3d20+10",
      "Faro e percepção às cegas"
    ],
    "saves": [
      [
        "Fortitude",
        "2d20+5"
      ],
      [
        "Reflexos",
        "3d20+10"
      ],
      [
        "Vontade",
        "4d20+10"
      ]
    ],
    "skills": [
      [
        "Enganação",
        "4d20+10"
      ],
      [
        "Medicina",
        "2d20+10"
      ],
      [
        "Ocultismo",
        "2d20+10"
      ],
      [
        "Religião",
        "4d20+10"
      ]
    ],
    "actions": [
      {
        "name": "Agredir — Cruz de Sangue",
        "type": "Padrão",
        "test": "1d20+15",
        "damage": "2d12+10 corte",
        "effect": "Dois ataques corpo a corpo."
      },
      {
        "name": "Clamor do Sangue Divino",
        "type": "Movimento",
        "effect": "Uma vez por cena, aliados escolhidos em alcance longo ganham um dado em testes de AGI, FOR ou VIG até o fim da cena."
      },
      {
        "name": "Bolsa de Sangue",
        "type": "Padrão",
        "damage": "3d8+3 cura",
        "effect": "Recupera PV de um alvo no alcance longo; a cura acima do máximo vira PV temporários."
      },
      {
        "name": "Sussurro Horripilante",
        "type": "Padrão",
        "damage": "4d6 mental",
        "effect": "Aplica efeito de presença perturbadora em alcance longo; DT 23, imune a partir de NEX 50%."
      },
      {
        "name": "Ritual — Vampirismo",
        "type": "Completa",
        "effect": "Ritual de Sangue de 2º círculo. Consulte as opções do ritual na referência de julho."
      },
      {
        "name": "Titereira de Sangue",
        "type": "Completa",
        "effect": "Domina ser em alcance longo que tenha consumido ou recebido seu sangue; Fortitude DT 23 impede ou encerra o controle."
      },
      {
        "name": "Transferir Sangue",
        "type": "Completa",
        "damage": "3d8+3 cura",
        "effect": "Uma vez por rodada transfere a própria vitalidade a ser adjacente; Reflexos DT 23 permite recusar a cura; indisponível se ela estiver morrendo."
      }
    ]
  },
  "Arquivos Secretos — Julho::Sabara": {
    "vd": 100,
    "pv": 200,
    "defense": 25,
    "movement": "9m",
    "attributes": {
      "AGI": 3,
      "INT": 2,
      "VIG": 2,
      "FOR": 3,
      "PRE": 2
    },
    "abilities": [
      {
        "name": "Monstruosidade",
        "effect": "Faro, percepção às cegas, resistência física 10, Sangue 20 e vulnerabilidade à Morte."
      }
    ],
    "pdfPage": 43,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral.",
    "resistances": [
      "Balístico, impacto e perfuração 10",
      "Sangue 20"
    ],
    "weaknesses": [
      "Morte"
    ],
    "size": "Médio",
    "senses": [
      "Percepção 2d20+5",
      "Iniciativa 3d20+10",
      "Faro e percepção às cegas"
    ],
    "saves": [
      [
        "Fortitude",
        "2d20+5"
      ],
      [
        "Reflexos",
        "3d20+10"
      ],
      [
        "Vontade",
        "2d20"
      ]
    ],
    "skills": [
      [
        "Acrobacia",
        "3d20+10"
      ],
      [
        "Atletismo",
        "3d20+10"
      ],
      [
        "Sobrevivência",
        "2d20+10"
      ]
    ],
    "actions": [
      {
        "name": "Agredir — Espada e Adaga",
        "type": "Padrão",
        "test": "3d20+15",
        "damage": "2d6+10 corte + 2d4 Sangue",
        "effect": "Dois ataques corpo a corpo; crítico 18.",
        "critical": "18"
      },
      {
        "name": "Agredir — Arremessar Faca",
        "type": "Padrão",
        "test": "3d20+15",
        "damage": "4d4+10 perfuração",
        "effect": "Dois ataques de alcance curto; crítico 19.",
        "critical": "19"
      },
      {
        "name": "Esquiva",
        "type": "Reação",
        "effect": "Uma vez por rodada recebe +10 Defesa contra ataque que esteja sofrendo."
      },
      {
        "name": "Mil Perfurações",
        "type": "Reação",
        "damage": "2d6 sangramento",
        "effect": "Se ambos os ataques corpo a corpo atingirem o mesmo alvo, causa sangramento (Fortitude DT 21 evita); sangramento de 2d6 PV."
      },
      {
        "name": "Ripostar e Revidar",
        "type": "Reação",
        "test": "3d20+15",
        "damage": "2d6+10 corte + 2d4 Sangue",
        "effect": "Uma vez por rodada, opõe um ataque de espada e adaga a agressão corpo a corpo; se vencer, evita dano e atinge o agressor."
      },
      {
        "name": "Ringen am Schwert",
        "type": "Livre",
        "test": "3d20+15",
        "damage": "6d6 Sangue",
        "effect": "Após acertar, tenta agarrar; uma mordida por rodada em alvo agarrado causa dano (Fortitude DT 21 metade) e cura metade do dano."
      },
      {
        "name": "Perseguir",
        "type": "Movimento",
        "effect": "Uma vez por rodada percorre até o dobro de seu deslocamento em direção a inimigo prioritário."
      },
      {
        "name": "Dança Armada",
        "type": "Padrão",
        "damage": "2d6+10 corte + 2d4 Sangue",
        "effect": "Dano em adjacentes escolhidos, Reflexos DT 21 reduz à metade."
      },
      {
        "name": "Golpe Derrubante",
        "type": "Padrão",
        "damage": "2d6+10 corte + 2d4 Sangue",
        "effect": "Golpe em alvo adjacente; Reflexos DT 21 reduz dano e evita queda. Se derrubar, pode reagir à movimentação da vítima."
      }
    ]
  },
  "Arquivos Secretos — Julho::Zéfero": {
    "vd": 80,
    "pv": 140,
    "defense": 23,
    "movement": "12m",
    "attributes": {
      "AGI": 2,
      "INT": 0,
      "VIG": 3,
      "FOR": 3,
      "PRE": 2
    },
    "abilities": [
      {
        "name": "Demônio de Coleira",
        "effect": "Age sob comando de Velisar. Após a morte do dono, pode ser domesticado por quem ofereça alimento e passe em Adestramento DT 20."
      },
      {
        "name": "Fome Bestial",
        "effect": "Se Velisar estiver ameaçado, prioriza seus agressores; em outras situações foca o combatente com menos PV."
      },
      {
        "name": "Monstruosidade",
        "effect": "Tem faro, percepção às cegas, resistências físicas 5 e Sangue 10; vulnerável à Morte."
      }
    ],
    "pdfPage": 45,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral.",
    "resistances": [
      "Balístico, impacto e perfuração 5",
      "Sangue 10"
    ],
    "weaknesses": [
      "Morte"
    ],
    "size": "Médio",
    "extraMovement": [
      "Escalar 12m"
    ],
    "senses": [
      "Percepção 2d20+5",
      "Iniciativa 2d20+10",
      "Faro e percepção às cegas"
    ],
    "saves": [
      [
        "Fortitude",
        "3d20+10"
      ],
      [
        "Reflexos",
        "2d20+5"
      ],
      [
        "Vontade",
        "2d20"
      ]
    ],
    "skills": [
      [
        "Atletismo",
        "3d20+10"
      ]
    ],
    "actions": [
      {
        "name": "Agredir — Garras",
        "type": "Padrão",
        "test": "3d20+10",
        "damage": "1d10+10 corte",
        "effect": "Dois ataques; crítico 19.",
        "critical": "19"
      },
      {
        "name": "Agredir — Mordida Furiosa",
        "type": "Padrão",
        "test": "3d20+10",
        "damage": "3d12+20 Sangue",
        "effect": "Crítico 19.",
        "critical": "19"
      },
      {
        "name": "Bloqueio",
        "type": "Reação",
        "effect": "Uma vez por rodada, recebe redução de dano 10 contra um ataque."
      },
      {
        "name": "Agarrão Lacerador",
        "type": "Livre",
        "test": "3d20+10",
        "damage": "4d6 Sangue",
        "effect": "Ao acertar mordida, pode agarrar; uma vez por rodada, morde alvo agarrado, Fortitude DT 20 reduz dano e cura metade do dano."
      },
      {
        "name": "Dilacerar",
        "type": "Livre",
        "damage": "1d10 corte",
        "effect": "Se dois ataques de garras atingirem o mesmo alvo, causa dano de corte adicional."
      }
    ]
  },
  "Arquivos Secretos — Julho::Incinerado": {
    "vd": 60,
    "pv": 100,
    "defense": 21,
    "movement": "9m",
    "attributes": {
      "AGI": 3,
      "INT": 0,
      "VIG": 2,
      "FOR": 3,
      "PRE": 0
    },
    "immunities": [
      "Fogo"
    ],
    "resistances": [
      "Balístico, corte e perfuração 5",
      "Sangue 10",
      "Energia 20"
    ],
    "weaknesses": [
      "Conhecimento"
    ],
    "abilities": [
      {
        "name": "Combustão Caótica",
        "effect": "Perde 10 PV no início do próprio turno e ganha ações ofensivas adicionais quando está machucado."
      },
      {
        "name": "Alimentar as Chamas",
        "effect": "Recupera PV quando alvos próximos sofrem dano pela condição em chamas."
      }
    ],
    "actions": [
      {
        "name": "Disparo de Labaredas",
        "type": "Padrão",
        "test": "3d20+10",
        "damage": "2d8+5 fogo",
        "effect": "Ataque à distância curto, com possibilidade de causar a condição em chamas."
      }
    ],
    "pdfPage": 65,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral."
  },
  "Arquivos Secretos — Julho::Strzyga": {
    "pv": 240,
    "movement": "9m; escalada 12m; voo 12m",
    "attributes": {
      "AGI": 3,
      "INT": 3,
      "VIG": 2,
      "FOR": 2,
      "PRE": 4
    },
    "resistances": [
      "Balístico, impacto e perfuração 10",
      "Químico e Sangue 20"
    ],
    "weaknesses": [
      "Fogo",
      "Morte"
    ],
    "abilities": [
      {
        "name": "Absorver Essência",
        "effect": "Ganha vantagem progressiva contra alvos de quem se alimentou repetidas vezes."
      },
      {
        "name": "Ecos de Essência",
        "effect": "Utiliza vestígios de memórias para reconhecer vínculos entre seus alvos."
      }
    ],
    "actions": [
      {
        "name": "Mordida e Garras",
        "type": "Padrão",
        "test": "3d20+15",
        "damage": "4d10+10 corte"
      },
      {
        "name": "Imitar Voz",
        "type": "Livre",
        "damage": "4d6 mental",
        "effect": "Imita vozes conhecidas para afetar emocionalmente alvos próximos; Vontade pode reduzir o dano."
      }
    ],
    "pdfPage": 67,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral.",
    "vd": 120,
    "defense": 28,
    "senses": [
      "Percepção 4d20+10 | Iniciativa 3d20+10 | Visão no escuro"
    ],
    "saves": [
      [
        "Fortitude",
        "2d20+5"
      ],
      [
        "Reflexos",
        "3d20+10"
      ],
      [
        "Vontade",
        "4d20+10"
      ]
    ]
  },
  "Arquivos Secretos — Julho::Apóstata": {
    "vd": 80,
    "pv": 111,
    "defense": 22,
    "movement": "0m",
    "attributes": {
      "AGI": 2,
      "INT": 3,
      "VIG": 2,
      "FOR": 2,
      "PRE": 4
    },
    "presence": "VD variável de 80 a 320 conforme evolução da ameaça",
    "immunities": [
      "Dano e condições, enquanto protegida por seu enigma"
    ],
    "weaknesses": [
      "Sangue"
    ],
    "abilities": [
      {
        "name": "Mentem Corrumpere",
        "effect": "Sua presença pode impor uma influência mental progressiva ligada aos seus ritos."
      },
      {
        "name": "Murus Idolorum",
        "effect": "Manifesta uma parede de ídolos com efeitos de Conhecimento, relacionada à sua proteção."
      },
      {
        "name": "Enigma de Medo",
        "effect": "A proteção depende de ritos; interrompê-los é essencial para enfraquecer a criatura."
      }
    ],
    "actions": [
      {
        "name": "Flagellum",
        "type": "Padrão",
        "test": "3d20+10",
        "damage": "6d10 mental",
        "effect": "Ataque à distância curta."
      },
      {
        "name": "Gnosis Absoluta",
        "type": "Reação",
        "effect": "Pode aumentar a resistência ao tipo de dano recebido quando está em estágio elevado."
      }
    ],
    "pdfPage": 70,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral.",
    "size": "MÉDIO"
  },
  "Arquivos Secretos — Julho::Velisar": {
    "resistances": [
      "Balístico, impacto e perfuração 10",
      "Sangue 20"
    ],
    "weaknesses": [
      "Morte"
    ],
    "size": "Médio",
    "vd": 100,
    "pv": 180,
    "defense": 25,
    "movement": "9m",
    "attributes": {
      "AGI": 2,
      "INT": 4,
      "VIG": 2,
      "FOR": 1,
      "PRE": 3
    },
    "senses": [
      "Percepção 3d20+10",
      "Iniciativa 2d20+5",
      "Faro e percepção às cegas"
    ],
    "saves": [
      [
        "Fortitude",
        "2d20"
      ],
      [
        "Reflexos",
        "2d20+5"
      ],
      [
        "Vontade",
        "3d20+10"
      ]
    ],
    "skills": [
      [
        "Artes",
        "3d20+10"
      ],
      [
        "Atletismo",
        "1d20+10"
      ],
      [
        "Ciências",
        "4d20+10"
      ],
      [
        "Ocultismo",
        "4d20+10"
      ],
      [
        "Tecnologia",
        "4d20+10"
      ]
    ],
    "abilities": [
      {
        "name": "Monstruosidade",
        "effect": "Tem faro, percepção às cegas, resistência física 10 e a Sangue 20, mas é vulnerável à Morte."
      },
      {
        "name": "Velisar Sabe",
        "effect": "Percebe manifestações e seres invisíveis em alcance médio; identifica ameaças e armadilhas em raio de 18m."
      }
    ],
    "actions": [
      {
        "name": "Agredir — Garras",
        "type": "Padrão",
        "test": "2d20+15",
        "damage": "2d10+10 corte",
        "effect": "Dois ataques corpo a corpo; crítico 19.",
        "critical": "19"
      },
      {
        "name": "Esquiva",
        "type": "Reação",
        "effect": "Uma vez por rodada, recebe +5 Defesa contra ataque que esteja sofrendo."
      },
      {
        "name": "Abraço Sanguinolento",
        "type": "Livre",
        "test": "3d20+15",
        "damage": "6d6 Sangue",
        "effect": "Após golpear com garras, tenta agarrar; uma mordida por rodada em alvo agarrado causa dano (Fortitude DT 21 metade) e cura metade do dano causado."
      },
      {
        "name": "Comandar Experimento",
        "type": "Movimento",
        "effect": "Uma vez por rodada dá ordem a experimento em alcance longo; ao obedecer em teste recebe um dado extra."
      },
      {
        "name": "Perseguir",
        "type": "Movimento",
        "effect": "Uma vez por rodada movimenta-se até duas vezes sua velocidade em direção a alvo prioritário."
      },
      {
        "name": "Armadilha Sanguinária",
        "type": "Padrão",
        "damage": "6d6 perfuração",
        "effect": "Cria armadilha em alcance médio; descoberta e desarme DT 21. Pode imobilizar, causar perfuração e sangramento ou paralisar, dependendo da opção."
      },
      {
        "name": "Olhar da Curiosidade Mórbida",
        "type": "Padrão",
        "effect": "Alvo em alcance médio deve resistir com Reflexos ou Vontade DT 21, ou fica fascinado até a condição terminar."
      }
    ],
    "pdfPage": 44,
    "narrative": "Registro de referência para uso na mesa virtual. Consulte a publicação oficial para o texto integral."
  }
};
