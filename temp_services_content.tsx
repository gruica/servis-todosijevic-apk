              <ScrollArea className="h-[700px]">
                <div className="space-y-2">
                  {filteredServices.map((service) => (
                    <Card 
                      key={service.id} 
                      className={`p-3 hover:bg-gray-50 transition-colors ${
                        highlightedServiceId === service.id 
                          ? 'ring-2 ring-blue-500 ring-offset-2' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Kompaktni prikaz osnovnih informacija */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          {/* ID i Status */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">#{service.id}</Badge>
                            {getStatusBadge(service.status)}
                            {service.devicePickedUp && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300 text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                Preuzet
                              </Badge>
                            )}
                          </div>
                          
                          {/* Klijent */}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{service.client.fullName}</p>
                            {service.client.city && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {service.client.city}
                              </p>
                            )}
                          </div>
                          
                          {/* Uređaj */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{service.appliance.category.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {service.appliance.manufacturer.name} {service.appliance.model}
                            </p>
                          </div>
                          
                          {/* Serviser */}
                          <div className="min-w-0">
                            {service.technician ? (
                              <div>
                                <p className="text-sm truncate">{service.technician.fullName}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {service.technician.specialization}
                                </p>
                              </div>
                            ) : (
                              <Select
                                value=""
                                onValueChange={(value) => handleAssignTechnician(service.id, parseInt(value))}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Dodeli..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Dodeli servisera...</SelectItem>
                                  {technicians.map((tech) => (
                                    <SelectItem key={tech.id} value={tech.id.toString()}>
                                      {tech.fullName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          
                          {/* Opis problema - skraćeno */}
                          <div className="min-w-0">
                            <p className="text-sm truncate">{service.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(service.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Kompaktni action buttons */}
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                            onClick={() => {
                              console.log("Native button clicked for service:", service.id);
                              setSelectedService(service);
                              setIsDetailsOpen(true);
                            }}
                            title="Pogledaj detalje"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                          <button
                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            onClick={() => handleEditService(service)}
                            title="Uredi servis"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            onClick={() => handleDeleteService(service)}
                            title="Obriši servis"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>